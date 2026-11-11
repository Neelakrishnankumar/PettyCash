import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, Image, Modal,
    Pressable, StyleSheet, ActivityIndicator, Keyboard, Platform,
    ToastAndroid, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Coffee, ArrowUpDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { store } from '../App';
import axios from 'axios';

const money = (n) => `Rs ${Number(n || 0).toFixed(2)}`;

// "MINT SODA (300 ml)OR சோடா OR ..." -> "MINT SODA (300 ml)"
const cleanName = (name = '') => name.split(/\s*OR\s*(?=[^\x00-\x7F])/)[0];

// "2026-08-07 02:29:47" -> "2026-08-07"
const onlyDate = (s = '') => s.slice(0, 10);

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

// full urls are kept as they are, file names get "<ImageUrl>/" added in front
const imageUri = (base = '', file = '') => {
    if (!file) return '';
    if (/^https?:\/\//i.test(file)) return file;
    return `${String(base).replace(/\/+$/, '')}/${String(file).replace(/^\/+/, '')}`;
};

// Date -> "YYYY-MM-DD" (local time)
const fmt = (d) => {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
};

// "YYYY-MM-DD" -> Date
const toDate = (s) => (s ? new Date(`${s}T00:00:00`) : new Date());

// Monday start; use x.getDay() instead of the expression for Sunday start
const startOfWeek = (d) => {
    const x = new Date(d);
    const diff = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - diff);
    return x;
};

const PRESETS = ['Today', 'This Week', 'This Month'];

const getPresetRange = (p) => {
    const now = new Date();
    if (p === 'Today') return { from: fmt(now), to: fmt(now) };
    if (p === 'This Week') {
        const start = startOfWeek(now);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { from: fmt(start), to: fmt(end) };
    }
    // This Month
    return {
        from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
};

const EMPTY = { from: '', to: '', payment: 'All', locationId: 'All' };
const TABS = ['Date', 'Payment', 'Location'];

// sort options: key is what is stored, label is what the user sees
const SORTS = [
    { key: 'high', label: 'High price' },
    { key: 'low', label: 'Low price' },
    { key: 'asc', label: 'Ascending (A - Z)' },
    { key: 'desc', label: 'Descending (Z - A)' },
];

// radio style row used in the right panel
const Row = ({ label, active, onPress }) => (
    <TouchableOpacity style={[styles.row, active && styles.rowActive]} onPress={onPress}>
        <Text style={[styles.rowText, active && styles.rowTextActive]}>{label}</Text>
        {active && <Text style={styles.tick}>✓</Text>}
    </TouchableOpacity>
);

// product image, or a dummy placeholder when empty / failed to load
const Thumb = ({ uri }) => {
    const [failed, setFailed] = useState(false);

    // reset if the uri changes
    useEffect(() => { setFailed(false); }, [uri]);

    if (!uri || failed) {
        return (
            <View style={[styles.thumb, styles.thumbEmpty]}>
                <Coffee size={24} color="#9a9486" />
            </View>
        );
    }
    return <Image source={{ uri }} style={styles.thumb} onError={() => setFailed(true)} />;
};

export default function ManageScreen() {
    const navigation = useNavigation();

    const [orders, setOrders] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);

    const [sort, setSort] = useState('');          // '' | 'high' | 'low' | 'asc' | 'desc'
    const [sortOpen, setSortOpen] = useState(false);

    const [filters, setFilters] = useState(EMPTY); // applied
    const [draft, setDraft] = useState(EMPTY);     // edited in modal
    const [tab, setTab] = useState('Date');
    const [pickerFor, setPickerFor] = useState(null); // 'from' | 'to' | null

    const ImageUrl = store.getState().globalurl.ImageUrl;

    const showToast = (msg) => {
        if (Platform.OS === 'android') ToastAndroid.show(String(msg), ToastAndroid.SHORT);
        else Alert.alert('', String(msg));
    };

    useFocusEffect(
        useCallback(() => {
            // back to normal every time the screen is opened
            setFilters(EMPTY);
            setDraft(EMPTY);
            setSearch('');
            setSort('');
            setSortOpen(false);
            setTab('Date');
            setPickerFor(null);
            setFilterOpen(false);

            OrderGet();
            LocationGet();
        }, [])
    );

    const OrderGet = async () => {
        try {
            setLoading(true);
            const url = store.getState().globalurl.OrderGet;
            const AuthUrl = store.getState().globalurl.Authorization;

            const storedCompanyId = await AsyncStorage.getItem('CompanyId');
            const CompanyId = storedCompanyId ? JSON.parse(storedCompanyId) : '';

            const response = await axios.post(url, { companyID: CompanyId }, {
                headers: { Authorization: AuthUrl },
            });

            console.log("CompanyId", CompanyId);
            console.log("url", url);

            console.log('OrderGet', response?.data);

            if (response?.data?.Status !== 'Y') {
                setOrders([]);
                showToast(response?.data?.Data || 'Unable to load orders');
                return;
            }
            setOrders(Array.isArray(response?.data?.Data) ? response.data.Data : []);
        } catch (error) {
            console.log('Order fetch error:', error);
            setOrders([]);
            showToast('Something went wrong while loading orders');
        } finally {
            setLoading(false);
        }
    };

    const LocationGet = async () => {
        try {
            const storedCompanyId = await AsyncStorage.getItem('CompanyId');
            const CompanyId = storedCompanyId ? JSON.parse(storedCompanyId) : '';

            const url = store.getState().globalurl.LocationGet;
            const AuthUrl = store.getState().globalurl.Authorization;

            const data = {
                Query: {
                    AccessID: 'TR128',
                    ScreenName: 'Location',
                    Filter: `parentID=${CompanyId}`,
                    Any: '',
                    CompId: CompanyId,
                },
            };

            const response = await axios.get(url, {
                params: { data: JSON.stringify(data) },
                headers: { Authorization: AuthUrl },
            });

            if (response?.data?.Status !== 'Y') {
                setLocations([]);
                showToast(response?.data?.Data || 'Unable to load locations');
                return;
            }

            const rows = Array.isArray(response?.data?.Data?.rows) ? response.data.Data.rows : [];

            const list = rows
                .filter((r) => r.Disable !== 'Y' && r.DeleteFlag !== 'Y')
                .map((r) => ({
                    id: String(r.RecordID), // matches order.location_id
                    code: r.Code,
                    name: r.Name,
                }));

            setLocations(list);
        } catch (error) {
            console.log('Location fetch error:', error);
            setLocations([]);
            showToast('Something went wrong while loading locations');
        }
    };

    const locationName = (id) => {
        const loc = locations.find((l) => l.id === String(id));
        return loc ? loc.name : '';
    };

    const paymentOptions = useMemo(
        () => ['All', ...Array.from(new Set(orders.map((o) => o.payment_mode).filter(Boolean)))],
        [orders]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const result = orders.filter((o) => {
            const d = onlyDate(o.created_at);
            if (filters.from && d < filters.from) return false;
            if (filters.to && d > filters.to) return false;
            if (filters.payment !== 'All' && o.payment_mode !== filters.payment) return false;
            if (filters.locationId !== 'All' && String(o.location_id) !== filters.locationId) return false;
            if (!q) return true;
            return (
                o.item_name.toLowerCase().includes(q) ||
                o.order_id_ref.toLowerCase().includes(q)
            );
        });

        // sort a copy, no sort selected -> keep the api order
        if (sort === 'high') return [...result].sort((a, b) => Number(b.grand_total || 0) - Number(a.grand_total || 0));
        if (sort === 'low') return [...result].sort((a, b) => Number(a.grand_total || 0) - Number(b.grand_total || 0));
        if (sort === 'asc') return [...result].sort((a, b) => cleanName(a.item_name).localeCompare(cleanName(b.item_name)));
        if (sort === 'desc') return [...result].sort((a, b) => cleanName(b.item_name).localeCompare(cleanName(a.item_name)));
        return result;
    }, [orders, search, filters, sort]);

    const revenue = useMemo(
        () => filtered.reduce((sum, o) => sum + Number(o.grand_total || 0), 0),
        [filtered]
    );

    const filterActive =
        filters.from || filters.to || filters.payment !== 'All' || filters.locationId !== 'All';

    // dot on left tabs when that section has a value
    const tabHasValue = (t) => {
        if (t === 'Date') return !!(draft.from || draft.to);
        if (t === 'Payment') return draft.payment !== 'All';
        return draft.locationId !== 'All';
    };

    const openFilter = () => {
        Keyboard.dismiss();
        setDraft(filters);
        setTab('Date');
        setPickerFor(null);
        setFilterOpen(true);
    };

    const closeFilter = () => {
        setPickerFor(null);
        setFilterOpen(false);
    };

    const applyFilter = () => {
        setFilters(draft);
        closeFilter();
    };

    const resetFilter = () => {
        setDraft(EMPTY);
        setFilters(EMPTY);
        closeFilter();
    };

    const openSort = () => {
        Keyboard.dismiss();
        setSortOpen(true);
    };

    // tap an option to apply it, tap the selected one again to clear the sort
    const pickSort = (key) => {
        setSort((prev) => (prev === key ? '' : key));
        setSortOpen(false);
    };

    const onDateChange = (event, selected) => {
        if (Platform.OS === 'android') {
            const field = pickerFor;
            setPickerFor(null);
            if (event.type === 'set' && selected && field) {
                setDraft((d) => ({ ...d, [field]: fmt(selected) }));
            }
            return;
        }
        // iOS: update live, close with "Done"
        if (selected && pickerFor) setDraft((d) => ({ ...d, [pickerFor]: fmt(selected) }));
    };

    // preset highlighted when draft range matches it exactly
    const activePreset = PRESETS.find((p) => {
        const r = getPresetRange(p);
        return draft.from === r.from && draft.to === r.to;
    });

    const applyPreset = (p) => {
        setPickerFor(null);
        setDraft((d) => ({ ...d, ...getPresetRange(p) }));
    };

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // "2026-08-16 05:26:47" -> "16 Aug 2026, 05.26"
    const prettyDate = (s = '') => {
        const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
        if (!m) return s;
        const [, y, mo, d, h, min] = m;
        return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}, ${h}.${min}`;
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.top}>
                <Thumb uri={imageUri(ImageUrl, item.image_url)} />
                <View style={styles.topText}>
                    <Text style={styles.item} numberOfLines={3}>{cleanName(item.item_name)}</Text>
                    <Text style={styles.date}>{prettyDate(item.created_at)}</Text>
                    {!!(locationName(item.location_id) || item.L_NAME) && (
                        <Text style={styles.date}>{locationName(item.location_id) || item.L_NAME}</Text>
                    )}
                </View>
            </View>

            <View style={styles.metaRow}>
                <View style={styles.chip}>
                    <Text style={styles.chipText}>{cap(item.payment_mode)}</Text>
                </View>
                <Text style={styles.qty}>Qty {item.quantity} * {money(item.item_price)}</Text>
                <Text style={styles.status}>{cap(item.order_status)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.bottom}>
                <View>
                    <Text style={styles.label}>ORDER REF</Text>
                    <Text style={styles.ref}>#{item.order_id_ref}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>TOTAL (incl. GST)</Text>
                    <Text style={styles.total}>{money(item.grand_total)}</Text>
                </View>
            </View>
        </View>
    );

    // a "From" / "To" field with clear button
    const DateField = ({ label, field }) => (
        <View style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.dateBox}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setPickerFor(field)}>
                    <Text style={draft[field] ? styles.dateValue : styles.datePlaceholder}>
                        {draft[field] || 'Select date'}
                    </Text>
                </TouchableOpacity>
                {!!draft[field] && (
                    <TouchableOpacity hitSlop={10} onPress={() => setDraft({ ...draft, [field]: '' })}>
                        <Text style={styles.clearX}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderRight = () => {
        if (tab === 'Date') {
            return (
                <View>
                    <View style={styles.presetWrap}>
                        {PRESETS.map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[styles.presetChip, activePreset === p && styles.presetChipActive]}
                                onPress={() => applyPreset(p)}
                            >
                                <Text style={[styles.presetText, activePreset === p && styles.presetTextActive]}>
                                    {p}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <DateField label="From" field="from" />
                    <DateField label="To" field="to" />

                    {pickerFor && (
                        <View>
                            <DateTimePicker
                                value={toDate(draft[pickerFor])}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                minimumDate={pickerFor === 'to' && draft.from ? toDate(draft.from) : undefined}
                                maximumDate={pickerFor === 'from' && draft.to ? toDate(draft.to) : undefined}
                                onChange={onDateChange}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity style={styles.doneBtn} onPress={() => setPickerFor(null)}>
                                    <Text style={styles.doneText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            );
        }

        if (tab === 'Payment') {
            return paymentOptions.map((p) => (
                <Row
                    key={p}
                    label={cap(p)}
                    active={draft.payment === p}
                    onPress={() => setDraft({ ...draft, payment: p })}
                />
            ));
        }

        return (
            <View>
                <Row
                    label="All"
                    active={draft.locationId === 'All'}
                    onPress={() => setDraft({ ...draft, locationId: 'All' })}
                />
                {locations.map((l) => (
                    <Row
                        key={l.id}
                        label={l.name}
                        active={draft.locationId === l.id}
                        onPress={() => setDraft({ ...draft, locationId: l.id })}
                    />
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.navigate('Home')} hitSlop={10}>
                    <Text style={styles.back}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>All Orders</Text>
                <TouchableOpacity style={styles.filterBtn} onPress={openFilter}>
                    <Text style={styles.filterText}>Filter{filterActive ? ' •' : ''}</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View>
                        <View style={styles.searchRow}>
                            <TextInput
                                style={styles.search}
                                placeholder="Search"
                                placeholderTextColor="#9a9486"
                                value={search}
                                onChangeText={setSearch}
                                returnKeyType="search"
                                onSubmitEditing={Keyboard.dismiss}
                            />
                            <TouchableOpacity
                                style={[styles.sortBtn, !!sort && styles.sortBtnActive]}
                                activeOpacity={0.85}
                                onPress={openSort}
                            >
                                <ArrowUpDown size={18} color={sort ? '#fff' : '#1f3d33'} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.summary}>
                            <Text style={styles.orders}>{filtered.length} ORDERS</Text>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.revLabel}>REVENUE</Text>
                                <Text style={styles.revenue}>{money(revenue)}</Text>
                            </View>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator style={{ marginTop: 30 }} color="#1f3d33" />
                    ) : (
                        <Text style={styles.empty}>No orders found</Text>
                    )
                }
            />

            {/* sort modal */}
            <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
                <Pressable style={styles.sortOverlay} onPress={() => setSortOpen(false)}>
                    <Pressable style={styles.sortBox}>
                        <Text style={styles.sortTitle}>Sort by</Text>
                        {SORTS.map((s) => (
                            <Row
                                key={s.key}
                                label={s.label}
                                active={sort === s.key}
                                onPress={() => pickSort(s.key)}
                            />
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* bottom filter sheet */}
            <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={closeFilter}>
                {/* provider so safe-area insets are available inside the Modal */}
                <SafeAreaProvider>
                    <Pressable style={styles.overlay} onPress={closeFilter}>
                        <Pressable style={styles.sheet}>
                            <SafeAreaView edges={['bottom']} style={styles.sheetInner}>
                                <View style={styles.handle} />
                                <Text style={styles.sheetHeader}>Filters</Text>

                                <View style={styles.body}>
                                    {/* left: headings */}
                                    <View style={styles.left}>
                                        {TABS.map((t) => {
                                            const active = t === tab;
                                            return (
                                                <TouchableOpacity
                                                    key={t}
                                                    style={[styles.tab, active && styles.tabActive]}
                                                    onPress={() => { setTab(t); setPickerFor(null); }}
                                                >
                                                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
                                                    {tabHasValue(t) && <View style={styles.dot} />}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* right: sub options */}
                                    <ScrollView
                                        style={styles.right}
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        {renderRight()}
                                    </ScrollView>
                                </View>

                                <View style={styles.btnRow}>
                                    <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={resetFilter}>
                                        <Text style={styles.btnGhostText}>Reset</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={applyFilter}>
                                        <Text style={styles.btnPrimaryText}>Apply</Text>
                                    </TouchableOpacity>
                                </View>
                            </SafeAreaView>
                        </Pressable>
                    </Pressable>
                </SafeAreaProvider>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f3eee7' },
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingVertical: 8,
    },
    back: { fontSize: 13, color: '#4a4739' },
    title: { fontSize: 18, color: '#1b1b1b' },
    filterBtn: {
        backgroundColor: '#fdfcf8', borderWidth: 1, borderColor: '#e2d9c8',
        borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16,
    },
    filterText: { fontSize: 13, color: '#1b1b1b' },
    list: { paddingHorizontal: 14, paddingBottom: 16 },
    searchRow: { flexDirection: 'row', alignItems: 'center' },
    search: {
        flex: 1,
        height: 42, backgroundColor: '#fdfcf8', borderRadius: 18, borderWidth: 1,
        borderColor: '#e2d9c8', paddingHorizontal: 16, fontSize: 13, color: '#1b1b1b',
    },
    sortBtn: {
        width: 42, height: 42, marginLeft: 8, borderRadius: 18, borderWidth: 1,
        borderColor: '#e2d9c8', backgroundColor: '#fdfcf8',
        alignItems: 'center', justifyContent: 'center',
    },
    sortBtnActive: { backgroundColor: '#1f3d33', borderColor: '#1f3d33' },
    summary: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#1f3d33', borderRadius: 18, paddingVertical: 12,
        paddingHorizontal: 16, marginTop: 10, marginBottom: 10,
    },
    orders: { color: '#fff', fontSize: 14 },
    revLabel: { color: '#cfe0d8', fontSize: 10, letterSpacing: 1.2 },
    revenue: { color: '#fff', fontSize: 18, marginTop: 2 },
    card: {
        backgroundColor: '#fdfcf8', borderRadius: 20, borderWidth: 1,
        borderColor: '#e2d9c8', padding: 12, marginBottom: 8,
    },
    top: { flexDirection: 'row' },
    thumb: { width: 56, height: 56, borderRadius: 14 },
    thumbEmpty: { backgroundColor: '#e9e2d3', alignItems: 'center', justifyContent: 'center' },
    topText: { flex: 1, marginLeft: 12 },
    item: { fontSize: 13, color: '#1b1b1b', lineHeight: 17 },
    date: { fontSize: 11, color: '#6f6a5c', marginTop: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    chip: { backgroundColor: '#e9e2d3', borderRadius: 12, paddingVertical: 5, paddingHorizontal: 12 },
    chipText: { fontSize: 11, color: '#4a4739' },
    qty: { fontSize: 11, color: '#6f6a5c', marginLeft: 10 },
    status: { fontSize: 11, color: '#1f6b46', marginLeft: 10 },
    divider: { height: 1, backgroundColor: '#e2d9c8', marginVertical: 10 },
    bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    label: { fontSize: 10, letterSpacing: 1.2, color: '#6f6a5c' },
    ref: { fontSize: 14, color: '#1b1b1b', marginTop: 2 },
    total: { fontSize: 17, color: '#1f3d33', marginTop: 2 },
    empty: { textAlign: 'center', color: '#6f6a5c', marginTop: 30, fontSize: 12 },

    // sort modal
    sortOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center', alignItems: 'center',
    },
    sortBox: {
        width: '80%', backgroundColor: '#fdfcf8', borderRadius: 18, padding: 14,
    },
    sortTitle: { fontSize: 16, color: '#1b1b1b', marginBottom: 12 },

    // bottom sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fdfcf8', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 10, paddingHorizontal: 14, height: '70%',
    },
    sheetInner: { flex: 1, paddingBottom: 10 }, // bottom inset is added by SafeAreaView
    handle: {
        alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#e2d9c8', marginBottom: 10,
    },
    sheetHeader: { fontSize: 16, color: '#1b1b1b', marginBottom: 10 },
    body: {
        flex: 1, flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1,
        borderColor: '#e2d9c8',
    },
    left: { width: 110, backgroundColor: '#f3eee7', borderRightWidth: 1, borderColor: '#e2d9c8' },
    tab: {
        paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'space-between',
    },
    tabActive: { backgroundColor: '#fdfcf8', borderLeftWidth: 3, borderLeftColor: '#1f3d33' },
    tabText: { fontSize: 13, color: '#6f6a5c' },
    tabTextActive: { color: '#1b1b1b' },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#1f6b46' },
    right: { flex: 1, paddingLeft: 12, paddingTop: 10 },

    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 11, paddingHorizontal: 10, borderRadius: 12, marginBottom: 6,
        borderWidth: 1, borderColor: '#e2d9c8',
    },
    rowActive: { backgroundColor: '#1f3d33', borderColor: '#1f3d33' },
    rowText: { fontSize: 13, color: '#4a4739', flex: 1 },
    rowTextActive: { color: '#fff' },
    tick: { color: '#fff', fontSize: 13, marginLeft: 8 },

    // date presets
    presetWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
    presetChip: {
        borderWidth: 1, borderColor: '#e2d9c8', borderRadius: 12,
        paddingVertical: 7, paddingHorizontal: 12, marginRight: 8, marginBottom: 8,
    },
    presetChipActive: { backgroundColor: '#1f3d33', borderColor: '#1f3d33' },
    presetText: { fontSize: 12, color: '#4a4739' },
    presetTextActive: { color: '#fff' },

    fieldLabel: { fontSize: 11, color: '#6f6a5c', marginBottom: 6, letterSpacing: 0.5 },
    dateBox: {
        flexDirection: 'row', alignItems: 'center', height: 42, borderWidth: 1,
        borderColor: '#e2d9c8', borderRadius: 12, paddingHorizontal: 12,
    },
    dateValue: { fontSize: 13, color: '#1b1b1b' },
    datePlaceholder: { fontSize: 13, color: '#9a9486' },
    clearX: { fontSize: 14, color: '#6f6a5c', paddingLeft: 8 },
    doneBtn: {
        alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 14,
        borderRadius: 10, backgroundColor: '#1f3d33', marginTop: 4,
    },
    doneText: { color: '#fff', fontSize: 12 },

    btnRow: { flexDirection: 'row', marginTop: 12 },
    btn: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    btnGhost: { borderWidth: 1, borderColor: '#e2d9c8', marginRight: 8 },
    btnGhostText: { color: '#4a4739', fontSize: 13 },
    btnPrimary: { backgroundColor: '#1f3d33' },
    btnPrimaryText: { color: '#fff', fontSize: 13 },
});