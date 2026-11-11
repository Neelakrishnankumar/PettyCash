import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

// point these to your real screens
import HomeScreen from './HomeScreen';
import CatalogScreen from './CatalogScreen';
import ManageScreen from './ManageScreen';

const Tab = createBottomTabNavigator();

// pill style tab bar (Home | Catalog | Manage)
function PillTabBar({ state, descriptors, navigation }) {

    return (
        <SafeAreaView edges={['bottom']}
            style={[styles.bar, { paddingBottom: 8 }]}>
            {state.routes.map((route, index) => {
                if (route.name === 'ProductList') return null; // hidden tab (opened from Catalog)
                const current = state.routes[state.index].name;
                // Catalog pill stays active while its product screen is open
                const focused = current === route.name || (current === 'ProductList' && route.name === 'Catalog');
                const label = descriptors[route.key].options.title ?? route.name;

                const onPress = () => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    const onProduct = state.routes[state.index].name === 'ProductList';
                    if ((!focused || onProduct) && !event.defaultPrevented) navigation.navigate(route.name);
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        activeOpacity={0.85}
                        style={[styles.pill, focused && styles.pillActive]}
                    >
                        <Text style={[styles.pillText, focused && styles.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                );
            })}
        </SafeAreaView>
    );
}

export default function BottomTab() {
    // params sent from LocationScreen: { locationId, locationCode, locationName }
    const { params } = useRoute();

    return (
        <Tab.Navigator
            initialRouteName="Home"
            tabBar={(props) => <PillTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="Home" component={HomeScreen} initialParams={params} />
            <Tab.Screen name="Catalog" component={CatalogScreen} initialParams={params} />
            <Tab.Screen name="Manage" component={ManageScreen} initialParams={params} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        backgroundColor: '#f3eee7',
        borderTopWidth: 1,
        borderTopColor: '#e2d9c8',
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    pill: {
        flex: 1,
        height: 40,
        marginHorizontal: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2d9c8',
        backgroundColor: '#fdfcf8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillActive: { backgroundColor: '#1f3d33', borderColor: '#1f3d33' },
    pillText: { fontSize: 13, color: '#4a4739' },
    pillTextActive: { color: '#fff', fontWeight: '600' },
});