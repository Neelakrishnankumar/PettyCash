import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Modal, Pressable, StyleSheet,
    ToastAndroid, Platform, Alert,
} from 'react-native';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { ArrowRight, MapPin, ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../App';
import axios from 'axios';

const DAY = 86400000;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAY_COLORS = ['#e8a921', '#1f3d33', '#8a7a68', '#4f7f9a', '#b5523b'];
const PERIODS = ['Week', 'Month', 'Overall'];
const SECTIONS = ['trend', 'split', 'top'];

const money = (n) => `Rs ${Number(n || 0).toFixed(2)}`;
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
// "MINT SODA (300 ml)OR சோடா OR ..." -> "MINT SODA (300 ml)"
const cleanName = (name = '') => name.split(/\s*OR\s*(?=[^\x00-\x7F])/)[0];
// "2026-08-07 02:29:47" -> timestamp
const toTime = (s = '') => new Date(s.replace(' ', 'T')).getTime();
const startOfDay = (t) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

/* ---------- dropdown ---------- */
const Dropdown = ({ value, options, onChange, width }) => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <TouchableOpacity style={[styles.dd, { width }]} onPress={() => setOpen(true)} activeOpacity={0.8}>
                <Text style={styles.ddText} numberOfLines={1}>{value}</Text>
                <ChevronDown size={14} color="#4a4739" />
            </TouchableOpacity>
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
                    <Pressable style={styles.sheet}>
                        {options.map((o) => (
                            <TouchableOpacity
                                key={o}
                                style={[styles.opt, o === value && styles.optActive]}
                                onPress={() => { onChange(o); setOpen(false); }}
                            >
                                <Text style={[styles.optText, o === value && styles.optTextActive]}>{o}</Text>
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};

/* ---------- line chart ---------- */
const TrendChart = ({ data, width }) => {
    const H = 130, padL = 24, padR = 10, padT = 14, padB = 22;
    const max = Math.max(2, ...data.map((d) => d.value));
    const w = Math.max(width - padL - padR, 10);
    const h = H - padT - padB;
    const x = (i) => padL + (data.length === 1 ? w / 2 : (i * w) / (data.length - 1));
    const y = (v) => padT + h - (v / max) * h;
    const ticks = Array.from({ length: max + 1 }, (_, i) => i).filter((t) => max <= 4 || t % Math.ceil(max / 4) === 0);
    const step = Math.ceil(data.length / 7);

    return (
        <Svg width={width} height={H}>
            {ticks.map((t) => (
                <React.Fragment key={t}>
                    <Line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="#e2d9c8" strokeWidth={1} />
                    <SvgText x={padL - 6} y={y(t) + 3} fontSize={9} fill="#6f6a5c" textAnchor="end">{t}</SvgText>
                </React.Fragment>
            ))}
            <Polyline
                points={data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')}
                fill="none" stroke="#1f3d33" strokeWidth={2}
            />
            {data.map((d, i) => (
                <React.Fragment key={i}>
                    {data.length <= 14 && <Circle cx={x(i)} cy={y(d.value)} r={2.5} fill="#1f3d33" />}
                    {d.value > 0 && data.length <= 14 && (
                        <SvgText x={x(i)} y={y(d.value) - 6} fontSize={9} fill="#1b1b1b" textAnchor="middle">{d.value}</SvgText>
                    )}
                    {i % step === 0 && (
                        <SvgText x={x(i)} y={H - 6} fontSize={9} fill="#6f6a5c" textAnchor="middle">{d.label}</SvgText>
                    )}
                </React.Fragment>
            ))}
        </Svg>
    );
};

/* ---------- donut ---------- */
const Donut = ({ parts, total, size = 110 }) => {
    const stroke = 18, r = (size - stroke) / 2, C = 2 * Math.PI * r;
    let offset = 0;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Circle cx={size / 2} cy={size / 2} r={r} stroke="#ece5d6" strokeWidth={stroke} fill="none" />
                {parts.map((p) => {
                    const len = total ? (p.count / total) * C : 0;
                    const el = (
                        <Circle
                            key={p.name}
                            cx={size / 2} cy={size / 2} r={r}
                            stroke={p.color} strokeWidth={stroke} fill="none"
                            strokeDasharray={`${len} ${C - len}`}
                            strokeDashoffset={-offset}
                            rotation={-90} origin={`${size / 2}, ${size / 2}`}
                        />
                    );
                    offset += len;
                    return el;
                })}
            </Svg>
            <Text style={styles.donutNum}>{total}</Text>
            <Text style={styles.donutSub}>Total orders</Text>
        </View>
    );
};

export default function HomeScreen() {
    const navigation = useNavigation();

    const [orders, setOrders] = useState([]);
    const [locations, setLocations] = useState([]); // [{ id, code, name }]
    const [locFilter, setLocFilter] = useState('All'); // location name
    const [period, setPeriod] = useState('Week');
    const [chartW, setChartW] = useState(0);

    const showToast = (msg) => {
        if (Platform.OS === 'android') ToastAndroid.show(String(msg), ToastAndroid.SHORT);
        else Alert.alert('', String(msg));
    };

    useFocusEffect(
        useCallback(() => {
            OrderGet();
            LocationGet();
        }, [])
    );

    const OrderGet = async () => {
        try {
            const url = store.getState().globalurl.OrderGet;
            const AuthUrl = store.getState().globalurl.Authorization;

            const storedCompanyId = await AsyncStorage.getItem('CompanyId');
            const CompanyId = storedCompanyId ? JSON.parse(storedCompanyId) : '';

            const response = await axios.post(url, { companyID: CompanyId }, {
                headers: { Authorization: AuthUrl },
            });

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
        }
    };

    const LocationGet = async () => {
        try {
            const storedRecId = await AsyncStorage.getItem('RECID');
            const RECID = storedRecId ? JSON.parse(storedRecId) : null;

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
            setLocations(
                rows
                    .filter((r) => r.Disable !== 'Y' && r.DeleteFlag !== 'Y')
                    .map((r) => ({ id: String(r.RecordID), code: r.Code, name: r.Name }))
            );
        } catch (error) {
            console.log('Location fetch error:', error);
            setLocations([]);
            showToast('Something went wrong while loading locations');
        }
    };

    // location options: from LocationGet, falling back to L_NAME in the orders
    const locOptions = useMemo(() => {
        if (locations.length) return ['All', ...locations.map((l) => l.name)];
        const names = Array.from(new Set(orders.map((o) => o.L_NAME).filter(Boolean)));
        return ['All', ...names];
    }, [locations, orders]);

    // every chart and total uses these location-filtered orders
    const filtered = useMemo(() => {
        if (locFilter === 'All') return orders;
        const loc = locations.find((l) => l.name === locFilter);
        return orders.filter((o) =>
            loc ? String(o.location_id) === loc.id : o.L_NAME === locFilter
        );
    }, [orders, locations, locFilter]);

    const revenue = useMemo(
        () => filtered.reduce((s, o) => s + Number(o.grand_total || 0), 0),
        [filtered]
    );

    // trend: Week = last 7 days, Month = last 30 days, Overall = per month
    const trend = useMemo(() => {
        if (period === 'Overall') {
            if (!filtered.length) return [];
            const times = filtered.map((o) => toTime(o.created_at)).filter((t) => !isNaN(t));
            const first = new Date(Math.min(...times));
            const last = new Date(Math.max(...times));
            const buckets = [];
            const cur = new Date(first.getFullYear(), first.getMonth(), 1);
            const end = new Date(last.getFullYear(), last.getMonth(), 1);
            while (cur <= end) {
                buckets.push({
                    key: `${cur.getFullYear()}-${cur.getMonth()}`,
                    value: 0,
                    label: MONTH_NAMES[cur.getMonth()],
                });
                cur.setMonth(cur.getMonth() + 1);
            }
            filtered.forEach((o) => {
                const d = new Date(toTime(o.created_at));
                const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
                if (b) b.value += 1;
            });
            return buckets;
        }

        const days = period === 'Week' ? 7 : 30;
        const today = startOfDay(Date.now());
        const buckets = Array.from({ length: days }, (_, i) => {
            const t = today - (days - 1 - i) * DAY;
            const d = new Date(t);
            return { t, value: 0, label: period === 'Week' ? DAY_NAMES[d.getDay()] : String(d.getDate()) };
        });
        filtered.forEach((o) => {
            const b = buckets.find((x) => x.t === startOfDay(toTime(o.created_at)));
            if (b) b.value += 1;
        });
        return buckets;
    }, [filtered, period]);

    // payment split
    const split = useMemo(() => {
        const map = {};
        filtered.forEach((o) => {
            const k = cap(o.payment_mode || 'Other');
            map[k] = (map[k] || 0) + 1;
        });
        return Object.keys(map).map((name, i) => ({
            name, count: map[name], color: PAY_COLORS[i % PAY_COLORS.length],
        }));
    }, [filtered]);

    // extra plot: top 5 items by quantity sold
    const topItems = useMemo(() => {
        const map = {};
        filtered.forEach((o) => {
            const k = cleanName(o.item_name);
            map[k] = (map[k] || 0) + Number(o.quantity || 0);
        });
        return Object.keys(map)
            .map((name) => ({ name, qty: map[name] }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [filtered]);

    const onLogout = async () => {
        try {
            const keys = ['login', 'Overall', 'CompanyId', 'RECID', 'Location'];
            await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
        } catch (e) {
            console.log('Logout error', e);
        }
        (navigation.getParent() || navigation).dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Loginscreen' }] })
        );
    };

    const goLocation = () =>
        (navigation.getParent() || navigation).dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'LocationScreen' }] })
        );

    const renderSection = ({ item }) => {
        if (item === 'trend') {
            return (
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <View>
                            <Text style={styles.cardTitle}>Orders Trend</Text>
                            <Text style={styles.cardSub}>{period} view</Text>
                        </View>
                        <Dropdown value={period} options={PERIODS} onChange={setPeriod} width={110} />
                    </View>
                    <View style={{ marginTop: 8 }} onLayout={(e) => setChartW(e.nativeEvent.layout.width)}>
                        {chartW > 0 && trend.length > 0 ? (
                            <TrendChart data={trend} width={chartW} />
                        ) : (
                            <Text style={styles.empty}>No data</Text>
                        )}
                    </View>
                </View>
            );
        }

        if (item === 'split') {
            return (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Payment Mode Split</Text>
                    {filtered.length === 0 ? (
                        <Text style={styles.empty}>No data</Text>
                    ) : (
                        <View style={styles.splitRow}>
                            <Donut parts={split} total={filtered.length} />
                            <View style={styles.legend}>
                                {split.map((p) => {
                                    const pct = Math.round((p.count / filtered.length) * 100);
                                    return (
                                        <View key={p.name} style={{ marginBottom: 10 }}>
                                            <View style={styles.legendTop}>
                                                <View style={[styles.dot, { backgroundColor: p.color }]} />
                                                <Text style={styles.legendName}>{p.name}</Text>
                                                <Text style={styles.legendVal}>{p.count} ({pct}%)</Text>
                                            </View>
                                            <View style={styles.track}>
                                                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: p.color }]} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </View>
            );
        }

        // top items
        const maxQty = Math.max(1, ...topItems.map((t) => t.qty));
        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Top Selling Items</Text>
                <Text style={styles.cardSub}>By quantity sold</Text>
                {topItems.length === 0 ? (
                    <Text style={styles.empty}>No data</Text>
                ) : (
                    <View style={{ marginTop: 12 }}>
                        {topItems.map((t, i) => (
                            <View key={t.name} style={{ marginBottom: 10 }}>
                                <View style={styles.legendTop}>
                                    <Text style={styles.rank}>{i + 1}</Text>
                                    <Text style={styles.legendName} numberOfLines={1}>{t.name}</Text>
                                    <Text style={styles.legendVal}>{t.qty}</Text>
                                </View>
                                <View style={styles.track}>
                                    <View
                                        style={[styles.fill, {
                                            width: `${(t.qty / maxQty) * 100}%`,
                                            backgroundColor: PAY_COLORS[i % PAY_COLORS.length],
                                        }]}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            <FlatList
                data={SECTIONS}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                renderItem={renderSection}
                ListHeaderComponent={
                    <View>
                        {/* hero */}
                        <View style={styles.hero}>
                            <View style={styles.heroTop}>
                                <Text style={styles.brand}>ORDERHUB</Text>
                                <TouchableOpacity style={styles.logout} onPress={onLogout} activeOpacity={0.8}>
                                    <Text style={styles.logoutText}>Logout</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.heroTitle}>All Orders</Text>
                            <Text style={styles.heroSub}>Live tracking & analytics</Text>
                            <View style={styles.heroBtns}>
                                <TouchableOpacity style={styles.whiteBtn} onPress={() => navigation.navigate('Catalog')} activeOpacity={0.85}>
                                    <Text style={styles.whiteBtnText}>Browse catalog</Text>
                                    <ArrowRight size={14} color="#1b1b1b" style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.whiteBtn} onPress={goLocation} activeOpacity={0.85}>
                                    <MapPin size={14} color="#1b1b1b" style={{ marginRight: 6 }} />
                                    <Text style={styles.whiteBtnText}>Location</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* totals */}
                        <View style={styles.totalRow}>
                            <View style={[styles.totalCard, { marginRight: 8 }]}>
                                <Text style={styles.totalLabel}>ORDERS</Text>
                                <Text style={styles.totalNum}>{filtered.length}</Text>
                            </View>
                            <View style={styles.totalCard}>
                                <Text style={styles.totalLabel}>REVENUE</Text>
                                <Text style={styles.totalNum}>{money(revenue)}</Text>
                            </View>
                        </View>

                        {/* analytics header + location filter */}
                        <View style={styles.rowBetween}>
                            <Text style={styles.eyebrow}>ANALYTICS</Text>
                            <Dropdown value={locFilter} options={locOptions} onChange={setLocFilter} width={140} />
                        </View>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f3eee7' },
    scroll: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16 },
    hero: { backgroundColor: '#1f3d33', borderRadius: 22, padding: 16 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    brand: { color: '#cfe0d8', fontSize: 10, letterSpacing: 1.5 },
    logout: { backgroundColor: '#fbeae8', borderRadius: 12, paddingVertical: 7, paddingHorizontal: 16 },
    logoutText: { color: '#9b3b2f', fontSize: 12 },
    heroTitle: { color: '#fff', fontSize: 24, marginTop: 4 },
    heroSub: { color: '#b7cbc2', fontSize: 11, marginTop: 2 },
    heroBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
    whiteBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdfcf8',
        borderRadius: 14, paddingVertical: 9, paddingHorizontal: 16,
    },
    whiteBtnText: { fontSize: 12, color: '#1b1b1b' },
    totalRow: { flexDirection: 'row', marginTop: 10 },
    totalCard: {
        flex: 1, backgroundColor: '#1f3d33', borderRadius: 18,
        paddingVertical: 10, paddingHorizontal: 16,
    },
    totalLabel: { color: '#cfe0d8', fontSize: 9, letterSpacing: 1.2 },
    totalNum: { color: '#fff', fontSize: 20, marginTop: 8 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    eyebrow: { fontSize: 10, letterSpacing: 1.2, color: '#6f6a5c' },
    dd: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fdfcf8', borderWidth: 1, borderColor: '#e2d9c8',
        borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    },
    ddText: { fontSize: 12, color: '#1b1b1b', flex: 1, marginRight: 4 },
    card: {
        backgroundColor: '#fdfcf8', borderRadius: 20, borderWidth: 1, borderColor: '#e2d9c8',
        padding: 14, marginTop: 10,
    },
    cardTitle: { fontSize: 13, color: '#1b1b1b' },
    cardSub: { fontSize: 10, color: '#6f6a5c', marginTop: 2 },
    empty: { textAlign: 'center', color: '#6f6a5c', fontSize: 12, marginVertical: 24 },
    splitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    donutNum: { fontSize: 20, color: '#1b1b1b' },
    donutSub: { fontSize: 9, color: '#6f6a5c' },
    legend: { flex: 1, marginLeft: 16 },
    legendTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    rank: { width: 16, fontSize: 11, color: '#6f6a5c' },
    legendName: { flex: 1, fontSize: 11, color: '#1b1b1b' },
    legendVal: { fontSize: 11, color: '#4a4739', marginLeft: 6 },
    track: { height: 6, borderRadius: 3, backgroundColor: '#ece5d6', overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 40 },
    sheet: { backgroundColor: '#fdfcf8', borderRadius: 16, paddingVertical: 6, maxHeight: '70%' },
    opt: { paddingVertical: 12, paddingHorizontal: 18 },
    optActive: { backgroundColor: '#ece5d6' },
    optText: { fontSize: 13, color: '#333' },
    optTextActive: { fontWeight: '700', color: '#1f3d33' },
});