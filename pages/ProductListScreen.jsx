import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet,
    ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform,
    ToastAndroid, Alert, Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coffee, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../App';
import axios from 'axios';

const PAYMENTS = ['Cash', 'GPay', 'HungerBox'];
const GST_PERCENT = 18; // change if your GST rate is different

const fmtLocal = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const showToast = (msg) => {
    if (Platform.OS === 'android') ToastAndroid.show(String(msg), ToastAndroid.SHORT);
    else Alert.alert('', String(msg));
};

const money = (n) => `Rs ${Number(n || 0).toFixed(2)}`;
const round2 = (n) => Math.round(n * 100) / 100;

// read a value saved with JSON.stringify (RECID, CompanyId, LocationId)
const getStored = async (key) => {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
};

// "IMG_1.png" -> "<ImageUrl>/IMG_1.png"
const imageUri = (file) => {
    if (!file) return '';
    const base = store.getState().globalurl.ImageUrl || '';
    return `${base.replace(/\/+$/, '')}/${file}`;
};

// keep the chosen day, but use the current time of day
const withCurrentTime = (d) => {
    const now = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(),
        now.getHours(), now.getMinutes(), now.getSeconds());
};

/* ------------------------------ API ------------------------------ */

// The products response has a name like FIG "O" HONEY (unescaped quotes), which is
// invalid JSON, so axios returns plain text. Escape those inner quotes and parse again.
// Linear time: looks at the nearest non-space chars instead of slicing the string.
const fixJson = (text) => {
    const n = text.length;
    const isSpace = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t';
    let out = '';
    for (let i = 0; i < n; i++) {
        const ch = text[i];
        if (ch !== '"' || text[i - 1] === '\\') { out += ch; continue; }

        let b = i - 1;
        while (b >= 0 && isSpace(text[b])) b--;
        let a = i + 1;
        while (a < n && isSpace(text[a])) a++;

        const before = b >= 0 ? text[b] : '';
        const after = a < n ? text[a] : '';
        const isEdgeQuote = '{[,:'.includes(before) || ':,}]'.includes(after) || after === '';
        out += isEdgeQuote ? '"' : '\\"';
    }
    return out;
};

// call the list api and return the rows
const getRows = async (query) => {
    const { LocationGet, Authorization } = store.getState().globalurl;

    const response = await axios.get(LocationGet, {
        params: { data: JSON.stringify({ Query: query }) },
        headers: { Authorization },
        transformResponse: [(text) => text], // keep text, we parse it below
    });

    let body = response.data;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            body = JSON.parse(fixJson(body));
        }
    }

    if (body?.Status !== 'Y') throw new Error(String(body?.Data || 'Unable to load data'));
    return Array.isArray(body.Data?.rows) ? body.Data.rows : body.Data;
};

const getCategories = async (companyId) => {
    const rows = await getRows({
        AccessID: 'TR002',
        ScreenName: 'Categories',
        Filter: '',
        Any: '',
        CompId: companyId,
    });
    return rows.map((r) => ({ id: String(r.RecordID), name: r.Name }));
};

const getProducts = async (companyId) => {
    const rows = await getRows({
        AccessID: 'TR001',
        ScreenName: 'Product Master',
        Filter: '',
        Any: '',
        parentID: '',
        CompId: companyId,
    });

    console.log('Product rows count:', rows.length);
    console.log('First product:', rows[0]);

    return rows
        .filter((r) => r.Disable !== 'Yes')
        .map((r) => ({
            id: String(r.RecordID),
            categoryId: String(r.parentID), // = category RecordID
            name: r.Description,
            price: Number(r.Price) || 0, // api field "Price" (string like "0.00")
            image: imageUri(r.Image),
        }));
};

// save one order (payload keys are exactly what the api expects)
const saveOrder = async ({ item, qty, note, payment, locationId, date }) => {
    const price = Number(item.price) || 0; // price from the product api
    const subtotal = round2(price * qty);
    const gst = round2((subtotal * GST_PERCENT) / 100);

    const payload = {
        user_id: Number(await getStored('RECID')),
        item_id: Number(item.id),
        item_name: item.name,
        item_price: price,
        quantity: qty,
        subtotal: subtotal,
        gst_amount: gst,
        grand_total: round2(subtotal + gst),
        payment_mode: payment.toLowerCase(), // cash | gpay | hungerbox
        comment: note.trim(),
        order_status: 'confirmed',
        order_id_ref: `ORD${Date.now()}`,
        created_at: fmtLocal(withCurrentTime(date)), // change format here if your api needs another one
        image_url: item.image,
        location_id: Number(locationId),
        company_id: Number(await getStored('CompanyId')),
    };
    console.log('payload', payload);

    const { OrderPost, Authorization } = store.getState().globalurl;
    console.log('OrderPost', OrderPost);
    const response = await axios.post(OrderPost, payload, { headers: { Authorization } });

    // this api answers { Status: "Success", Message: "Order inserted successfully" }
    const { Status, Message, Data } = response.data || {};
    const saved = Status === 'Success' || Status === 'Y';
    if (!saved) throw new Error(String(Message || Data || 'Unable to save order'));
};

/* ---------------------------- Thumbnail ---------------------------- */
// shows the product image, or a dummy placeholder when empty / failed to load
const Thumb = ({ uri }) => {
    const [failed, setFailed] = useState(false);

    // reset if the uri changes
    useEffect(() => { setFailed(false); }, [uri]);

    if (!uri || failed) {
        return (
            <View style={[styles.thumb, styles.thumbEmpty]}>
                <Coffee size={22} color="#9a9486" />
            </View>
        );
    }
    return <Image source={{ uri }} style={styles.thumb} onError={() => setFailed(true)} />;
};

/* ---------------------------- Date picker ---------------------------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const fmtDate = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const DatePickerField = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

    const openModal = () => {
        Keyboard.dismiss();
        setView(new Date(value.getFullYear(), value.getMonth(), 1));
        setOpen(true);
    };

    const changeMonth = (step) =>
        setView(new Date(view.getFullYear(), view.getMonth() + step, 1));

    // blanks for the first week + all days of the month
    const cells = useMemo(() => {
        const y = view.getFullYear();
        const m = view.getMonth();
        const blanks = new Date(y, m, 1).getDay();
        const days = new Date(y, m + 1, 0).getDate();
        return [
            ...Array(blanks).fill(null),
            ...Array.from({ length: days }, (_, i) => new Date(y, m, i + 1)),
        ];
    }, [view]);

    const pick = (d) => {
        onChange(d);
        setOpen(false);
    };

    return (
        <>
            <TouchableOpacity style={styles.dateField} activeOpacity={0.85} onPress={openModal}>
                <View style={styles.dateLeft}>
                    <Calendar size={16} color="#1f3d33" />
                    <Text style={styles.dateLabel}>Date</Text>
                </View>
                <Text style={styles.dateValue}>{fmtDate(value)}</Text>
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
                    <TouchableOpacity activeOpacity={1} style={styles.calendar}>
                        <View style={styles.calHeader}>
                            <TouchableOpacity onPress={() => changeMonth(-1)} hitSlop={10} style={styles.navBtn}>
                                <Text style={styles.navText}>{'<'}</Text>
                            </TouchableOpacity>
                            <Text style={styles.calTitle}>
                                {MONTHS[view.getMonth()]} {view.getFullYear()}
                            </Text>
                            <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={10} style={styles.navBtn}>
                                <Text style={styles.navText}>{'>'}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weekRow}>
                            {WEEK.map((w, i) => (
                                <Text key={i} style={styles.weekText}>{w}</Text>
                            ))}
                        </View>

                        <View style={styles.grid}>
                            {cells.map((d, i) => {
                                if (!d) return <View key={`b${i}`} style={styles.dayCell} />;
                                const selected = sameDay(d, value);
                                const today = sameDay(d, new Date());
                                return (
                                    <TouchableOpacity key={i} style={styles.dayCell} onPress={() => pick(d)}>
                                        <View style={[styles.dayCircle, today && styles.dayToday, selected && styles.daySelected]}>
                                            <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                                                {d.getDate()}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.calFooter}>
                            <TouchableOpacity onPress={() => pick(new Date())}>
                                <Text style={styles.footerText}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <Text style={styles.footerText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

/* ---------------------------- Product card ---------------------------- */
// selectedDate is shared by all cards (kept in the screen). null = not selected -> current date
const ProductCard = ({ item, saving, showDate, selectedDate, onDateChange, onPay }) => {
    const [qty, setQty] = useState('1');
    const [note, setNote] = useState('');

    const pay = async (payment) => {
        // BackLog != Y or no date selected -> current date
        const orderDate = showDate && selectedDate ? selectedDate : new Date();
        const saved = await onPay(item, Number(qty), note, payment, orderDate);
        if (saved) {
            setQty('1');
            setNote('');
            // the selected date is kept for the next product
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.top}>
                <Thumb uri={item.image} />
                <View style={styles.topText}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.price}>{money(item.price)} / per unit</Text>
                </View>
            </View>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.qty}
                    value={qty}
                    onChangeText={(t) => setQty(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    textAlign="center"
                    maxLength={3}
                />
                <TextInput
                    style={styles.note}
                    placeholder="Add note for this item"
                    placeholderTextColor="#9a9486"
                    value={note}
                    onChangeText={setNote}
                    multiline
                />
            </View>

            {showDate && (
                <DatePickerField value={selectedDate || new Date()} onChange={onDateChange} />
            )}

            <View style={styles.payRow}>
                {PAYMENTS.map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.payBtn, saving && styles.payBtnDisabled]}
                        disabled={saving}
                        activeOpacity={0.85}
                        onPress={() => pay(p)}
                    >
                        <Text style={styles.payText}>{p}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

/* ------------------------------ Screen ------------------------------ */
export default function ProductListScreen() {
    const navigation = useNavigation();
    const { params } = useRoute(); // { categoryId, categoryName }

    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeId, setActiveId] = useState(String(params?.categoryId));
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backLog, setBackLog] = useState(false); // BackLog = "Y" -> show date picker
    const [selectedDate, setSelectedDate] = useState(null); // shared by all products, null = current date
    const chipsRef = useRef(null);

    // category tapped on the Catalog screen
    useEffect(() => {
        if (params?.categoryId) setActiveId(String(params.categoryId));
    }, [params?.categoryId]);

    // load chips + products once
    useEffect(() => {
        const load = async () => {
            try {
                const companyId = (await getStored('CompanyId')) || '170';

                const backLogValue = await AsyncStorage.getItem('BackLog');
                let flag = backLogValue;
                try { flag = JSON.parse(backLogValue); } catch (e) { } // works for "Y" and '"Y"'
                setBackLog(flag === 'Y');

                const [cats, prods] = await Promise.all([getCategories(companyId), getProducts(companyId)]);

                console.log('Route params:', params);
                console.log('Common data:', {
                    companyId,
                    activeId,
                    backLog: flag,
                    categories: cats,
                    products: prods.slice(0, 5), // first 5 only, keeps Metro fast
                    productsCount: prods.length,
                });

                setCategories(cats);
                setProducts(prods);
            } catch (error) {
                console.log('Load error:', error);
                showToast(error.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // new category -> clear search and go back to the first chip
    useEffect(() => {
        setSearch('');
        chipsRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, [activeId]);

    // selected category first, others keep their order
    const chips = useMemo(() => {
        const selected = categories.find((c) => c.id === activeId);
        return selected ? [selected, ...categories.filter((c) => c.id !== activeId)] : categories;
    }, [categories, activeId]);

    // products of the selected category + search
    const list = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter(
            (p) => p.categoryId === activeId && p.name.toLowerCase().includes(q)
        );
    }, [products, activeId, search]);

    useEffect(() => {
        console.log('Product list:', list);
    }, [list]);

    const title = categories.find((c) => c.id === activeId)?.name || params?.categoryName || '';

    // Cash / GPay / HungerBox pressed -> save that product. Returns true when saved.
    const onPay = async (item, qty, note, payment, date) => {
        Keyboard.dismiss();
        if (saving) return false;
        if (!qty || qty < 1) {
            showToast('Enter a quantity');
            return false;
        }

        const locationId = (await getStored('LocationId')) || params?.locationId;
        if (!locationId) {
            showToast('Select a location first');
            return false;
        }

        setSaving(true);
        try {
            await saveOrder({ item, qty, note, payment, locationId, date });
            showToast(`Order saved - ${payment}`);
            return true;
        } catch (error) {
            console.log('Save error:', error);
            showToast(error.message || 'Something went wrong while saving the order');
            return false;
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.sideBtn}>
                        <Text style={styles.back}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    <View style={styles.sideBtn} />
                </View>

                {/* fixed top: category names + search (always visible) */}
                <View style={styles.fixedTop}>
                    <FlatList
                        ref={chipsRef}
                        data={chips}
                        keyExtractor={(c) => c.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        style={styles.chipsList}
                        contentContainerStyle={styles.chips}
                        renderItem={({ item }) => {
                            const active = item.id === activeId;
                            return (
                                <TouchableOpacity
                                    style={[styles.chip, active && styles.chipActive]}
                                    activeOpacity={0.85}
                                    onPress={() => setActiveId(item.id)}
                                >
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                    <TextInput
                        style={styles.search}
                        placeholder="Search..."
                        placeholderTextColor="#9a9486"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                        onSubmitEditing={Keyboard.dismiss}
                    />
                </View>

                {/* only the products scroll */}
                <FlatList
                    data={list}
                    keyExtractor={(item) => item.id}
                    extraData={selectedDate}
                    renderItem={({ item }) => (
                        <ProductCard
                            item={item}
                            saving={saving}
                            showDate={backLog}
                            selectedDate={selectedDate}
                            onDateChange={setSelectedDate}
                            onPay={onPay}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    initialNumToRender={6}
                    windowSize={5}
                    removeClippedSubviews
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator style={{ marginTop: 30 }} color="#1f3d33" />
                        ) : (
                            <Text style={styles.empty}>No products in this category. Pick another one above.</Text>
                        )
                    }
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f3eee7' },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
    sideBtn: { width: 60 },
    back: { fontSize: 13, color: '#4a4739' },
    title: { flex: 1, textAlign: 'center', fontSize: 16, color: '#1b1b1b' },
    fixedTop: { paddingHorizontal: 14 },
    list: { paddingHorizontal: 14, paddingBottom: 16, paddingTop: 2 },
    chipsList: { flexGrow: 0 },
    chips: { paddingBottom: 10 },
    chip: {
        backgroundColor: '#fdfcf8',
        borderWidth: 1,
        borderColor: '#e2d9c8',
        borderRadius: 18,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 8,
    },
    chipActive: { backgroundColor: '#1f3d33', borderColor: '#1f3d33' },
    chipText: { fontSize: 12, color: '#1b1b1b' },
    chipTextActive: { color: '#fff' },
    search: {
        height: 40,
        backgroundColor: '#fdfcf8',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        paddingHorizontal: 14,
        fontSize: 12,
        color: '#1b1b1b',
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#fdfcf8',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        padding: 10,
        marginBottom: 10,
    },
    top: { flexDirection: 'row' },
    thumb: { width: 50, height: 50, borderRadius: 12 },
    thumbEmpty: { backgroundColor: '#e9e2d3', alignItems: 'center', justifyContent: 'center' },
    topText: { flex: 1, marginLeft: 10 },
    name: { fontSize: 12, color: '#1b1b1b', lineHeight: 16 },
    price: { fontSize: 12, color: '#1f6b46', marginTop: 4 },
    inputRow: { flexDirection: 'row', marginTop: 8 },
    qty: {
        width: 80,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        backgroundColor: '#fdfcf8',
        fontSize: 14,
        color: '#1b1b1b',
        paddingVertical: 0,
    },
    note: {
        flex: 1,
        minHeight: 40,
        maxHeight: 70,
        marginLeft: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        backgroundColor: '#f7f3ea',
        fontSize: 12,
        color: '#1b1b1b',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    payRow: { flexDirection: 'row', marginTop: 13 },
    payBtn: {
        flex: 1,
        height: 38,
        marginHorizontal: 3,
        borderRadius: 12,
        backgroundColor: '#1f3d33',
        alignItems: 'center',
        justifyContent: 'center',
    },
    payBtnDisabled: { opacity: 0.5 },
    payText: { color: '#fff', fontSize: 12 },
    empty: { textAlign: 'center', color: '#6f6a5c', marginTop: 30, fontSize: 12 },

    /* date picker */
    dateField: {
        marginTop: 8,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        backgroundColor: '#f7f3ea',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateLeft: { flexDirection: 'row', alignItems: 'center' },
    dateLabel: { fontSize: 12, color: '#6f6a5c', marginLeft: 8 },
    dateValue: { fontSize: 12, color: '#1b1b1b' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    calendar: { width: '88%', backgroundColor: '#fdfcf8', borderRadius: 18, padding: 14 },
    calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    navText: { fontSize: 18, color: '#1f3d33' },
    calTitle: { fontSize: 14, color: '#1b1b1b' },
    weekRow: { flexDirection: 'row' },
    weekText: { width: '14.285%', textAlign: 'center', fontSize: 11, color: '#9a9486', marginBottom: 6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.285%', height: 38, alignItems: 'center', justifyContent: 'center' },
    dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dayToday: { borderWidth: 1, borderColor: '#1f3d33' },
    daySelected: { backgroundColor: '#1f3d33' },
    dayText: { fontSize: 12, color: '#1b1b1b' },
    dayTextSelected: { color: '#fff' },
    calFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 6 },
    footerText: { fontSize: 12, color: '#1f3d33' },
});