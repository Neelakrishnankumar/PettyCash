import React from 'react';
import axios from 'axios';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();
import Loginscreen from './pages/Loginscreen';
import globalurl from './reducers/globalurl';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import { ThemeProvider } from './components/ThemeContext';

import HomeScreen from './pages/HomeScreen';
import BottomTab from './pages/BottomTab';
import LocationScreen from './pages/LocationScreen';
import ManageScreen from './pages/ManageScreen';
import CatalogScreen from './pages/CatalogScreen';
import ProductListScreen from './pages/ProductListScreen';


export const store = configureStore({
  reducer: {
    globalurl: globalurl,
  },
})

const App = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Loginscreen">
            <Stack.Screen name="BottomTab" component={BottomTab} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="Loginscreen" component={Loginscreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="LocationScreen" component={LocationScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="ManageScreen" component={ManageScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="CatalogScreen" component={CatalogScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false, gestureEnabled: false }} />
          </Stack.Navigator>
        </NavigationContainer>

      </ThemeProvider>
    </Provider>
  );
};

export default App;
