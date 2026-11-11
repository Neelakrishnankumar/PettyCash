import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    StyleSheet,
    ActivityIndicator,
    Keyboard,
    Platform,
    ToastAndroid,
    Alert,
} from 'react-native';
import { CommonActions, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Coffee } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../App';
import axios from 'axios';

// "IMG_2024.png" -> "<ImageUrl>/IMG_2024.png" (full urls are kept as they are)
const imageUri = (base = '', file = '') => {
    if (!file) return '';
    if (/^https?:\/\//i.test(file)) return file;
    return `${String(base).replace(/\/+$/, '')}/${String(file).replace(/^\/+/, '')}`;
};

// category image, or a dummy placeholder when empty / failed to load
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

export default function CatalogScreen() {
    const navigation = useNavigation();
    const { params } = useRoute(); // { locationId, locationCode, locationName, username }

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [userName, setUserName] = useState('');

    const showToast = (msg) => {
        if (Platform.OS === 'android') ToastAndroid.show(String(msg), ToastAndroid.SHORT);
        else Alert.alert('', String(msg));
    };

    const ImageUrl = store.getState().globalurl.ImageUrl;

    // AsyncStorage.getItem is async, so read the name inside an effect
    useEffect(() => {
        AsyncStorage.getItem('Name').then((v) => {
            if (!v) return;
            try { setUserName(JSON.parse(v)); } catch (e) { setUserName(v); }
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            OrderGet();
        }, [])
    );

    const OrderGet = async () => {
        try {
            setLoading(true);

            const storedCompanyId = await AsyncStorage.getItem('CompanyId');
            const CompanyId = storedCompanyId ? JSON.parse(storedCompanyId) : '170';

            const url = store.getState().globalurl.LocationGet;
            const AuthUrl = store.getState().globalurl.Authorization;

            const data = {
                Query: {
                    AccessID: "TR002",
                    ScreenName: "Categories",
                    Filter: "",
                    Any: "",
                    CompId: CompanyId,
                }
            };

            console.log("url", url);
            console.log("data", data);

            const response = await axios.get(url, {
                params: { data: JSON.stringify(data) },
                headers: { Authorization: AuthUrl },
            });
            console.log("response", response);

            if (response?.data?.Status !== 'Y') {
                setCategories([]);
                showToast(response?.data?.Data || 'Unable to load categories');
                return;
            }

            const rows = Array.isArray(response?.data?.Data)
                ? response.data.Data
                : Array.isArray(response?.data?.Data?.rows)
                    ? response.data.Data.rows
                    : [];

            // use only Name, keep RecordID to pass to the next screen
            setCategories(
                rows.map((r) => ({
                    id: String(r.RecordID),
                    name: r.Name,
                    image: imageUri(ImageUrl, r.Image), // ImageUrl + file name
                }))
            );
            console.log('[CATEGORY IMAGE] sample:', rows[0]?.Image, '->', imageUri(ImageUrl, rows[0]?.Image));
        } catch (error) {
            console.log('Category fetch error:', error);
            setCategories([]);
            showToast('Something went wrong while loading categories');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, search]);

    const onLogout = async () => {
        try {
            const keys = ['login', 'Overall', 'CompanyId', 'RECID', 'Location'];
            await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
        } catch (e) {
            console.log('Logout error', e);
        }
        // reset the root stack (works from inside the tab navigator)
        (navigation.getParent() || navigation).dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Loginscreen' }] })
        );
    };

    const onSelect = (item) => {
        Keyboard.dismiss();
        // pass only the selected category RecordID (+ name for the title)
        navigation.navigate('ProductList', {
            categoryId: item.id,
            categoryName: item.name,
        });
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => onSelect(item)}>
            <Thumb uri={item.image} />
            <Text style={styles.name} numberOfLines={2}>
                {item.name}
            </Text>
            <ArrowRight size={16} color="#1b1b1b" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
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
                        <View style={styles.headerCard}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={styles.eyebrow}>CATALOG</Text>
                                <Text style={styles.user}>{userName || 'admin'}</Text>
                                <Text style={styles.sub}>Choose a department to browse products and place orders.</Text>
                            </View>
                            <TouchableOpacity style={styles.logout} onPress={onLogout} activeOpacity={0.8}>
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.search}
                            placeholder="Search categories..."
                            placeholderTextColor="#9a9486"
                            value={search}
                            onChangeText={setSearch}
                            returnKeyType="search"
                            onSubmitEditing={Keyboard.dismiss}
                        />

                        <Text style={styles.count}>{filtered.length} CATEGORIES AVAILABLE</Text>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator style={{ marginTop: 30 }} color="#1f3d33" />
                    ) : (
                        <Text style={styles.empty}>No categories found</Text>
                    )
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f3eee7' },
    list: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16 },
    headerCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fdfcf8',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        padding: 14,
    },
    eyebrow: { fontSize: 10, letterSpacing: 1.2, color: '#6f6a5c' },
    user: { fontSize: 20, color: '#1b1b1b', marginTop: 2 },
    sub: { fontSize: 11, color: '#6f6a5c', marginTop: 4, lineHeight: 15 },
    logout: {
        backgroundColor: '#fbeae8',
        borderWidth: 1,
        borderColor: '#e2d9c8',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    logoutText: { color: '#9b3b2f', fontSize: 13 },
    search: {
        height: 42,
        marginTop: 10,
        backgroundColor: '#fdfcf8',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        paddingHorizontal: 16,
        fontSize: 13,
        color: '#1b1b1b',
    },
    count: { fontSize: 10, letterSpacing: 1.2, color: '#6f6a5c', marginTop: 12, marginBottom: 8, marginLeft: 2 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fdfcf8',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        padding: 10,
        marginBottom: 8,
    },
    thumb: { width: 52, height: 52, borderRadius: 14 },
    thumbEmpty: { backgroundColor: '#e9e2d3', alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, fontSize: 14, color: '#1b1b1b', marginHorizontal: 12 },
    empty: { textAlign: 'center', color: '#6f6a5c', marginTop: 30, fontSize: 12 },
});