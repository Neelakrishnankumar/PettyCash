import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
    ToastAndroid,
    Alert,
    Platform,
    BackHandler,
} from 'react-native';
import { CommonActions, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { store } from '../App';
import axios from 'axios';

const showToast = (msg) => {
    if (Platform.OS === 'android') ToastAndroid.show(String(msg), ToastAndroid.SHORT);
    else Alert.alert('', String(msg));
};

export default function LocationScreen() {
    const navigation = useNavigation();
    const route = useRoute();

    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        AsyncStorage.getItem('Name').then((v) => {
            if (!v) return;
            try { setUserName(JSON.parse(v)); } catch (e) { setUserName(v); }
        });
    }, []);

    useFocusEffect(
        useCallback(() => {
            LocationGet();
        }, [])
    );

    const lastBackPress = useRef(0);

    useFocusEffect(
        useCallback(() => {
            if (Platform.OS !== 'android') return;

            const onBackPress = () => {
                const now = Date.now();

                // second press within 2 seconds -> exit app
                if (now - lastBackPress.current < 2000) {
                    BackHandler.exitApp();
                    return true;
                }

                // first press -> show toast
                lastBackPress.current = now;
                ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
                return true; // stop the default back action
            };

            const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => sub.remove(); // removed when you leave this screen
        }, [])
    );

    const LocationGet = async () => {
        try {
            setLoading(true);

            const storedRecId = await AsyncStorage.getItem('RECID');
            const RECID = storedRecId ? JSON.parse(storedRecId) : null;

            const storedCompanyId = await AsyncStorage.getItem('CompanyId');
            const CompanyId = storedCompanyId ? JSON.parse(storedCompanyId) : '170';

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
            console.log("url", url);
            console.log("data", data);


            const response = await axios.get(url, {
                params: { data: JSON.stringify(data) },
                headers: { Authorization: AuthUrl },
            });
            console.log("response", response);

            if (response?.data?.Status !== 'Y') {
                setLocations([]);
                showToast(response?.data?.Data || 'Unable to load locations');
                return;
            }

            const rows = Array.isArray(response?.data?.Data?.rows) ? response.data.Data.rows : [];

            // keep only enabled / non-deleted rows and map to what the UI needs
            const list = rows
                .filter((r) => r.Disable !== 'Y' && r.DeleteFlag !== 'Y')
                .map((r) => ({
                    id: String(r.RecordID), // selected recid
                    code: r.Code,
                    name: r.Name,
                }));

            setLocations(list);
        } catch (error) {
            console.log('Location fetch error:', error);
            setLocations([]);
            showToast('Something went wrong while loading locations');
        } finally {
            setLoading(false);
        }
    };

    const onSelect = async (item) => {
        try {
            // selected location RecordID (used when saving orders) + the full item
            await AsyncStorage.setItem('LocationId', JSON.stringify(item.id));
            await AsyncStorage.setItem('Location', JSON.stringify(item));
            console.log('[LOCATION] saved LocationId:', item.id, '| item:', item);
        } catch (e) {
            console.log('Location save error', e);
        }

        navigation.navigate('BottomTab', {
            locationId: item.id,
            locationCode: item.code,
            locationName: item.name,
        });
    };

    const onLogout = async () => {
        try {
            // removeItem works on every AsyncStorage version (multiRemove is missing in some)
            const keys = ['login', 'Overall', 'CompanyId', 'RECID', 'Location', 'LocationId'];
            await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
        } catch (e) {
            console.log('Logout error', e);
        }
        // reset the stack so back button can't return to this screen
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Loginscreen' }], // <-- your login route name
            })
        );
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => onSelect(item)}>
            <View style={styles.cardText}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.dash}>-</Text>
                <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                </Text>
            </View>
            <View style={styles.arrowBtn}>
                <ArrowRight size={16} color="#fff" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView edges={['bottom', 'top']} style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#f3eee7" />
            <View style={styles.container}>
                <FlatList
                    data={locations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.list}
                    refreshing={loading && locations.length > 0}
                    onRefresh={LocationGet}
                    ListHeaderComponent={
                        <View style={styles.header}>
                            <Text style={styles.eyebrow}>LOCATION</Text>
                            <Text style={styles.heading}>{userName}, choose a location to continue.</Text>
                        </View>
                    }
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator style={{ marginTop: 40 }} color="#1f3d33" />
                        ) : (
                            <Text style={styles.empty}>No locations found</Text>
                        )
                    }
                />

                <TouchableOpacity style={styles.logout} onPress={onLogout} activeOpacity={0.8}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f3eee7' },
    container: { flex: 1, paddingHorizontal: 14, paddingBottom: 12 },
    list: { paddingTop: 10, paddingBottom: 10 },
    header: { marginBottom: 12, paddingHorizontal: 4 },
    eyebrow: { fontSize: 10, letterSpacing: 1.2, color: '#6f6a5c', marginBottom: 4 },
    heading: { fontSize: 18, color: '#1b1b1b', lineHeight: 23 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fdfcf8',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        paddingVertical: 12,
        paddingLeft: 14,
        paddingRight: 12,
        marginBottom: 8,
    },
    cardText: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    code: { fontSize: 11, color: '#6f6a5c', letterSpacing: 0.8 },
    dash: { fontSize: 11, color: '#6f6a5c', marginHorizontal: 6 },
    name: { fontSize: 14, color: '#1b1b1b', flexShrink: 1 },
    arrowBtn: {
        width: 38,
        height: 30,
        borderRadius: 10,
        backgroundColor: '#1f3d33',
        alignItems: 'center',
        justifyContent: 'center',
    },
    empty: { textAlign: 'center', color: '#6f6a5c', marginTop: 30, fontSize: 12 },
    logout: {
        alignSelf: 'flex-start',
        backgroundColor: '#fbeae8',
        borderWidth: 1,
        borderColor: '#e2d9c8',
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 18,
    },
    logoutText: { color: '#9b3b2f', fontSize: 13 },
});