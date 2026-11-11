import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    Image,
    StyleSheet,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    Pressable,
    ActivityIndicator,
    ToastAndroid,
    Alert,
} from 'react-native';
import { Eye, EyeOff, ChevronDown, Check, Search } from 'lucide-react-native';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../App';

const showToast = (msg) => {
    if (Platform.OS === 'android') ToastAndroid.show(String(msg), ToastAndroid.SHORT);
    else Alert.alert('', String(msg));
};

// API may return an array directly or wrap it in Data / data
const extractList = (body) => {
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.Data)) return body.Data;
    if (Array.isArray(body?.data)) return body.data;
    return [];
};

/* ---------- Reusable modal dropdown with search ---------- */
const SelectField = ({
    label,
    placeholder,
    options,
    value,
    onChange,
    loading,
    error,
    searchPlaceholder = 'Search...',
}) => {
    const [visible, setVisible] = useState(false);
    const [query, setQuery] = useState('');
    const selected = options.find((o) => o.value === value);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [options, query]);

    const open = () => {
        Keyboard.dismiss(); // KEYBOARD FIX: hide keyboard before opening modal
        setVisible(true);
    };

    const close = () => {
        Keyboard.dismiss();
        setVisible(false);
        setQuery('');
    };

    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.label}>{label}</Text>

            <TouchableOpacity
                style={[styles.select, error && styles.errorBorder]}
                activeOpacity={0.7}
                onPress={open}
            >
                <Text
                    style={selected ? styles.selectText : styles.placeholder}
                    numberOfLines={1}
                >
                    {selected ? selected.label : placeholder}
                </Text>
                {loading ? (
                    <ActivityIndicator size="small" color="#6b6884" />
                ) : (
                    <ChevronDown size={18} color="#6b6884" />
                )}
            </TouchableOpacity>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
                <KeyboardAvoidingView
                    style={styles.flex1}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <Pressable style={styles.overlay} onPress={close}>
                        {/* inner Pressable stops taps inside the sheet from closing it */}
                        <Pressable style={styles.sheet} onPress={() => Keyboard.dismiss()}>
                            <Text style={styles.sheetTitle}>{placeholder}</Text>

                            <View style={styles.searchWrap}>
                                <Search size={16} color="#8e8ba8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder={searchPlaceholder}
                                    placeholderTextColor="#8e8ba8"
                                    value={query}
                                    onChangeText={setQuery}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="search"
                                    onSubmitEditing={Keyboard.dismiss}
                                />
                            </View>

                            <FlatList
                                data={filtered}
                                keyExtractor={(item) => String(item.value)}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>
                                        {loading ? 'Loading...' : 'No results found'}
                                    </Text>
                                }
                                renderItem={({ item }) => {
                                    const active = item.value === value;
                                    return (
                                        <TouchableOpacity
                                            style={[styles.option, active && styles.optionActive]}
                                            onPress={() => {
                                                onChange(item.value);
                                                close();
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    active && styles.optionTextActive,
                                                ]}
                                            >
                                                {item.label}
                                            </Text>
                                            {active && <Check size={18} color="#2f4a4f" style={styles.tick} />}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </Pressable>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};


export default function Loginscreen() {
    const navigation = useNavigation();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [company, setCompany] = useState(null); // selected company RecordID
    const [year, setYear] = useState(null); // selected year RecordID
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const [companyLoading, setCompanyLoading] = useState(false);
    const [companyData, setCompanyData] = useState([]);
    const [yearLoading, setYearLoading] = useState(false);
    const [yearData, setYearData] = useState([]);

    const { loginUrl, Authorization } = useSelector((state) => state.globalurl);

    // dropdown options: show Name / Id, keep RecordID as value
    const companyOptions = useMemo(
        () =>
            companyData.map((c) => ({
                label: c.Name,
                value: String(c.RecordID),
            })),
        [companyData]
    );

    const yearOptions = useMemo(
        () =>
            yearData.map((y) => ({
                label: y.Id,
                value: String(y.RecordID),
            })),
        [yearData]
    );

    const fetchDropdown = async (accessid, setData, setLoad) => {
        try {
            setLoad(true);
            const url = store.getState().globalurl.Dropdown;
            const AuthUrl = store.getState().globalurl.Authorization;

            const response = await axios.post(
                url,
                { accessid, action: 'getall', recid: '' },
                { headers: { Authorization: AuthUrl } }
            );
            setData(extractList(response?.data));
        } catch (error) {
            console.log('Request error:', error);
            setData([]); // keep as [] so .map never crashes
        } finally {
            setLoad(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDropdown('TR014', setCompanyData, setCompanyLoading); // company
            fetchDropdown('TR015', setYearData, setYearLoading); // year
        }, [])
    );

    const validate = () => {
        const e = {};
        if (!username.trim()) e.username = 'Username is required';
        if (!password) e.password = 'Password is required';
        if (!company) e.company = 'Please select a company';
        if (!year) e.year = 'Please select a financial year';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleLogin = async () => {
        Keyboard.dismiss();
        if (!validate()) return;

        setIsLoading(true);
        try {
            const data = {
                Query: {
                    username: username.trim(),
                    password,
                    companyrecordid: company, // selected company RecordID
                    yearrecordid: year, // selected year RecordID
                },
            };
            console.log('data', data);

            const response = await axios.get(loginUrl, {
                params: { data: JSON.stringify(data) },
                headers: { Authorization },
            });
            console.log('loginUrl', loginUrl);

            const res = response.data;
            console.log('LOGIN RESPONSE ===>', res);

            if (res.Status === 'Y') {
                // await AsyncStorage.setItem('login', 'true');
                await AsyncStorage.setItem('Name', JSON.stringify(res.Data.Name));
                await AsyncStorage.setItem('CompanyId', JSON.stringify(res.Data.CompanyRecordid));
                await AsyncStorage.setItem('RECID', JSON.stringify(res.Data.Recordid));
                await AsyncStorage.setItem('BackLog', JSON.stringify(res.Data.BackLog));
                navigation.replace('LocationScreen');
            } else {
                showToast(res.Data || 'Invalid Credentials');
                console.log('Login Error', res.Data);
            }
        } catch (error) {
            console.log('Login error ---->', error);
            showToast('Something went wrong during login');
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = (key) => setErrors((p) => ({ ...p, [key]: undefined }));

    return (
        <KeyboardAvoidingView
            style={styles.flex1}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* KEYBOARD FIX: tap outside inputs to hide keyboard */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    <Image
                        source={require('../assets/Applogo1.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View style={styles.card}>
                        <Text style={styles.title}>Sign in</Text>
                        <Text style={styles.subtitle}>
                            Use your account to browse the catalog and place an order.
                        </Text>

                        <Text style={styles.label}>USERNAME</Text>
                        <TextInput
                            style={[styles.input, errors.username && styles.errorBorder]}
                            placeholder="Enter your username"
                            placeholderTextColor="#8e8ba8"
                            value={username}
                            onChangeText={(t) => {
                                setUsername(t);
                                clearError('username');
                            }}
                            autoCapitalize="none"
                            returnKeyType="next"
                        />
                        {!!errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

                        <Text style={[styles.label, { marginTop: 14 }]}>PASSWORD</Text>
                        <View style={[styles.passwordWrap, errors.password && styles.errorBorder]}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Enter your password"
                                placeholderTextColor="#8e8ba8"
                                value={password}
                                onChangeText={(t) => {
                                    setPassword(t);
                                    clearError('password');
                                }}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword((p) => !p)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={styles.eyeBtn}
                            >
                                {showPassword ? (
                                    <EyeOff size={20} color="#6b6884" />
                                ) : (
                                    <Eye EyeOff size={20} color="#6b6884" />
                                )}
                            </TouchableOpacity>
                        </View>
                        {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                        <SelectField
                            label="COMPANY"
                            placeholder="Select company"
                            searchPlaceholder="Search company"
                            options={companyOptions}
                            value={company}
                            loading={companyLoading}
                            error={errors.company}
                            onChange={(v) => {
                                setCompany(v);
                                clearError('company');
                            }}
                        />

                        <SelectField
                            label="YEAR"
                            placeholder="Select financial year"
                            searchPlaceholder="Search year"
                            options={yearOptions}
                            value={year}
                            loading={yearLoading}
                            error={errors.year}
                            onChange={(v) => {
                                setYear(v);
                                clearError('year');
                            }}
                        />

                        <TouchableOpacity
                            style={[styles.button, isLoading && { opacity: 0.7 }]}
                            onPress={handleLogin}
                            activeOpacity={0.85}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Login</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    container: { flexGrow: 1, justifyContent: 'center', padding: 18, backgroundColor: '#e0dce6' },
    logo: { width: 160, height: 90, alignSelf: 'center', marginBottom: 24 },
    card: {
        backgroundColor: '#eceafc',
        borderRadius: 22,
        padding: 18,
    },
    title: { fontSize: 22, fontWeight: '700', color: '#1b1b2f' },
    subtitle: { fontSize: 12, color: '#7a7794', marginTop: 6, marginBottom: 18 },
    label: { fontSize: 10, fontWeight: '700', color: '#55526e', marginBottom: 6, letterSpacing: 0.5 },
    input: {
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d6d2ee',
        backgroundColor: '#e6e3f8',
        paddingHorizontal: 14,
        fontSize: 13,
        color: '#1b1b2f',
    },
    passwordWrap: {
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d6d2ee',
        backgroundColor: '#e6e3f8',
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 14,
        paddingRight: 10,
    },
    passwordInput: { flex: 1, fontSize: 13, color: '#1b1b2f', paddingVertical: 0 },
    eyeBtn: { paddingLeft: 8 },
    eyeIcon: { fontSize: 18 },
    errorBorder: { borderColor: '#d64545' },
    errorText: { color: '#d64545', fontSize: 11, marginTop: 4, marginLeft: 4 },
    fieldWrap: { marginTop: 14 },
    select: {
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d6d2ee',
        backgroundColor: '#e6e3f8',
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectText: { fontSize: 13, color: '#1b1b2f', flex: 1, marginRight: 8 },
    placeholder: { fontSize: 13, color: '#6b6884', flex: 1, marginRight: 8 },
    chevron: { fontSize: 18, color: '#6b6884', marginTop: -6 },
    button: {
        marginTop: 22,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#2f4a4f',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    /* modal */
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 28,
    },
    sheet: {
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingVertical: 14,
        maxHeight: '70%',
    },
    sheetTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1b1b2f',
        paddingHorizontal: 18,
        paddingBottom: 10,
    },
    searchWrap: {
        height: 42,
        marginHorizontal: 14,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d6d2ee',
        backgroundColor: '#f4f2fc',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: '#1b1b2f', paddingVertical: 0 },
    option: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    optionActive: { backgroundColor: '#eceafc' },
    optionText: { fontSize: 14, color: '#333', flex: 1 },
    optionTextActive: { fontWeight: '700', color: '#2f4a4f' },
    tick: { color: '#2f4a4f', fontWeight: '700', marginLeft: 8 },
    emptyText: { textAlign: 'center', color: '#8e8ba8', paddingVertical: 20, fontSize: 13 },
});