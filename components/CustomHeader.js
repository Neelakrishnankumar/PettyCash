import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomModal from './CenteredModal';
// import { logout } from './logout';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';

const CustomHeader = ({ title = '', type, Nav = null }) => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);

  const { colors, isDark, typography } = useTheme();

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const Navigateto = (screen) => {
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    setModalVisible(false);
    // logout();
  };

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle(
        isDark ? 'light-content' : 'dark-content',
        true,
      );

      StatusBar.setBackgroundColor(colors.background, true);

      return () => { };
    }, [isDark, colors.background]),
  );

  return (
    <>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={isDark ? "light" : "dark-content"}
      />
      <SafeAreaView
        edges={['top']}
        style={{ backgroundColor: colors.NavbarbgColour }}
      >
        <View
          style={{
            height: 30 + StatusBar.currentHeight,
            // paddingTop: StatusBar.currentHeight,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 10,
            backgroundColor: colors.NavbarbgColour,
          }}
        >
          {/* LEFT BUTTON */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {type === "Y" && (
              <TouchableOpacity
                onPress={() => Nav ? Navigateto(Nav) : goBack()}
              >
                <Image
                  source={require('../assets/left-arrow.png')}
                  style={{
                    width: 25,
                    height: 25,
                    tintColor: colors.NavbarTextColour,
                    marginLeft: 0,
                  }}
                />
              </TouchableOpacity>
            )}
            <View style={{ alignItems: 'flex-start' }}>
              <Text
                allowFontScaling={false}
                style={[
                  typography.topHeading,
                  {
                    color: colors.NavbarTextColour,
                    marginLeft: 7,
                    letterSpacing: 0.5,
                  },
                ]}
              >
                {title}
              </Text>
            </View>
          </View>

        </View>
      </SafeAreaView >

      <CustomModal
        visible={modalVisible}
        message="Are you sure you want to exit the BEX ATM App?"
        onCancel={() => setModalVisible(false)}
        onConfirm={handleLogout}
      />
    </>
  );
};

export default CustomHeader;