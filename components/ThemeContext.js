// ThemeContext.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useState, useContext, useEffect } from "react";
import { Text } from "react-native";

export const Fonts = {
  // Poppins
  regular: "Poppins-Regular",
  medium: "Poppins-Medium",
  semiBold: "Poppins-SemiBold",
  bold: "Poppins-Bold",
  extraBold: "Poppins-ExtraBold",

  // Inter
  interRegular: "Inter-Regular",
  interMedium: "Inter-Medium",
  interSemiBold: "Inter-SemiBold",
  interBold: "Inter-Bold",
};

export const typography = {
  topHeading: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 24,
  },

  heading: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },

  subHeading: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 15,
  },

  searchText: {
    fontFamily: Fonts.interRegular,
    fontSize: 11,
    lineHeight: 14,
  },

  buttonText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
  },

  smallText: {
    fontFamily: Fonts.interRegular,
    fontSize: 9,
    lineHeight: 12,
  },

  label: {
    fontFamily: Fonts.interMedium,
    fontSize: 10,
    lineHeight: 13,
  },

  body: {
    fontFamily: Fonts.interRegular,
    fontSize: 11,
    lineHeight: 15,
  },

  bodyBold: {
    fontFamily: Fonts.interSemiBold,
    fontSize: 11,
    lineHeight: 15,
  },
};

// ---------------- Captions ----------------
const captions = {
  welcomeTitle: {
    ...typography.h1,
    color: "#fff",
    textAlign: "left",
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  welcomeSubtitle: {
    ...typography.bodyMedium,
    color: "#ccc",
    marginTop: 8,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  sectionTitle: {
    ...typography.h3,
    color: "#111",
    textAlign: "left",
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: "#777",
    textAlign: "justify",
  },
  dividerText: {
    ...typography.bodySmall,
    color: "#fff",
    textAlign: "center",
    marginHorizontal: 8,
  },
  buttonText: {
    ...typography.h6Bold,
    color: "#1e5e76",
    textAlign: "center",
    marginHorizontal: 8,
  },
};

export const Spacing = {
  XXS: 4,
  XS: 8,
  S: 12,
  M: 16,
  MM: 20,
  L: 24,
  XL: 32,
  XXL: 40,
};

export const Radius = {
  XXS: 4,
  XS: 8,
  S: 12,
  M: 16,
  L: 24,
  XL: 32,
  XXL: 40,
};

// ---------------- Light & Dark Themes ----------------
export const ThemeLight = {
  Mode: "Light",
  Background: "#ffffff",   // E.g Page background
  CardBackground: "#ffffff", // e.g card background  
  SectionBackground: "#f2f4f5", // e.g background for list like language,skills,etc.,
  Border: "#d1d5d8", // e.g Button or List or Card Border
  InputBackground: '#F9FAFB', // input text box background colour
  SpecialButtonBackground: '#FEF7FF', // e.g Send OTP
  TextPrimary: "#1a1a1a",  // e.g all text for Label,Text
  TextSecondary: "rgba(0,0,0,0.54)", // e.g for  lable below heading or outside text box
  TextDisabled: "rgba(77,77,77,0.4)", // e.g for placeholder text
  TextAccent: "#007aff",  // e.g for hyperlink or link like Add more
  loader: "#1a1a1a",  // e.g for Activity Indicator 
  IconColor: "#1a1a1a",  // e.g for icon and Image Colour 
  ChipBG: '#F8F8FD',
  BrandPrimary: "#f25e21",  // Special Button text e.g Send OTP
  BrandSecondary: "#19495c",
  UploadBoxBackground: '#feefe9',
  UploadBoxTextcolor: '#1a1a1a',
  ShareBtnBackground: '#cce4ff',
  UploadGigBg: '#E6F9EF',
  GigTextColor: '#56CDAD',
  ButtonPrimaryBG: "#f25e21",      // e.g Primary Button background Like contiue
  ButtonPrimaryText: "#ffffff",    // e.g Primary Button text colour 
  ButtonSecondaryBG: "#19495c",   // e.g Secndary Button background Like uploadphoto
  ButtonTertiaryBG: "#2853AF",   // e.g Secndary Button background Like uploadphoto
  ButtonSecondaryText: "#ffffff", // e.g Secndary Button text Like uploadphoto
  ButtonGhostIcon: "#505050",
  SecondaryContainer: '#e8def8',
  Success: "#2e9e4d",    // e.g for Success Toast Colour
  Warning: "#f5a623",   // e.g for Warning Toast Colour
  Error: "#ff3b30",    // e.g for Error Toast Colour
  Iconsplcolor: '#2626edff',
  VerifiedBG: '#d5ecdb',
  StandardColor: '#ffffff',
  ChartColor: '#7b61ff',
  NavbarbgColour: "#7A69C2",
  NavbarTextColour: "#ffffff",
  TitleBarbgColour: "#f2f4f5",
  TitleBarTextColour: "#19495c",
  pricingButtonColor: '#EAF4F7',
  HighlightBG: '#E0F0FF',
  HighlightAltBG: '#FFF0E0',
  // Logo: require("../assets/Crea.jpg"),
  AppTitle: "ATM",
  AppTitleText: "Attendance - Task Manager",
  typography,
  captions,
};

export const ThemeDark = {
  Mode: "Dark",
  Background: "#101414",           // E.g Page background
  CardBackground: "#1a1d1f",       // e.g card background  
  SectionBackground: "#131718",    // e.g background for list like language,skills,etc.,
  Border: "#2e2e2e",               // e.g Button or List or Card Border
  InputBackground: "#2a2d2f",       // input text box background colour
  SpecialButtonBackground: '#FEF7FF',  // e.g Send OTP
  TextPrimary: "#f5f5f5",           // e.g all text for Label,Text
  TextSecondary: "rgba(255,255,255,0.54)",    // e.g for  lable below heading or outside text box
  TextAccent: "#4d9bff",    // e.g for hyperlink or link like Add more
  loader: "#f5f5f5",   // e.g for Activity Indicator 
  IconColor: "#f5f5f5",  // e.g for icon and Image Colour 
  VerifiedBG: '#d5ecdb',
  BrandPrimary: "#f3683c",    // Special Button text e.g Send OTP
  BrandSecondary: "#1e5e76",
  UploadBoxBackground: '#feefe9',
  UploadBoxTextcolor: '#1a1a1a',
  UploadGigBg: '#E6F9EF',
  GigTextColor: '#56CDAD',
  ShareBtnBackground: '#cce4ff',
  ButtonPrimaryBG: "#f3683c",    // e.g Primary Button background Like contiue
  ButtonPrimaryText: "#f5f5f5",  // e.g Primary Button text colour 
  ButtonSecondaryBG: "#1e5e76", // e.g Secndary Button background Like uploadphoto
  ButtonTertiaryBG: "#2853AF",   // e.g Secndary Button background Like uploadphoto
  ButtonSecondaryText: "#ffffff",  // e.g Secndary Button text Like uploadphoto
  ButtonGhostIcon: "#505050",
  SecondaryContainer: '#e8def8',
  StandardColor: '#ffffff',
  Success: "#2e9e4d",   // e.g for Success Toast Colour
  Warning: "#f5a623",   // e.g for Warning Toast Colour
  Error: "#ff3b30",      // e.g for Error Toast Colour
  Iconsplcolor: '#2626edff',
  NavbarbgColour: "#7A69C2",
  NavbarTextColour: "#ffffff",
  TitleBarbgColour: "#1a1d1f",
  TitleBarTextColour: "#f3683c",
  ChartColor: '#7b61ff',
  ChipBG: '#2C2C34',
  // Logo: require("../assets/bexlogowob.png"),
  AppTitle: "EEP",
  AppTitleText: "Emveetech Employee Portal",
  pricingButtonColor: '#223A43',
  HighlightBG: '#1C2A33',
  HighlightAltBG: '#3D2E20',
  typography,
  captions,
};

// ---------------- Context Provider ----------------
// const ThemeContext = createContext();

const ThemeContext = createContext({
  isDark: false,
  colors: {},
  typography: {},
  toggleTheme: () => { },
});

export const ThemeProvider = ({ children }) => {
  // const systemTheme = useColorScheme();

  // const isDark = systemTheme === 'dark';

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const theme = await AsyncStorage.getItem("APP_THEME");

      if (theme !== null) {
        setIsDark(JSON.parse(theme));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const toggleTheme = async value => {
    try {
      setIsDark(value);

      await AsyncStorage.setItem(
        "APP_THEME",
        JSON.stringify(value)
      );
    } catch (e) {
      console.log(e);
    }
  };

const colors = {
  background: isDark ? "#111827" : "#F8FAFC",
  tanseparentbackground: isDark ? "#11182700" : "#F8FAFC00",

  chatbackground: isDark ? "#1E293B" : "#F8FAFC",

  text: isDark ? "#F8FAFC" : "#0F172A",
  subText: isDark ? "#94A3B8" : "#64748B",

  EditIcon: isDark ? "#38BDF8" : "#0369A1",
  EditIconBack: isDark
    ? "rgba(56,189,248,0.15)"
    : "rgba(3,105,161,0.10)",

  DeleteIcon: isDark ? "#F87171" : "#DC2626",
  DeleteIconBack: isDark
    ? "rgba(248,113,113,0.15)"
    : "rgba(220,38,38,0.10)",

  card: isDark ? "#1E293B" : "#FFFFFF",

  tabBackground: isDark ? "#1E293B" : "#FFFFFF",

  border: isDark ? "#334155" : "#CBD5E1",

  line: isDark ? "#334155" : "#E2E8F0",

  searchBackground: isDark ? "#1E293B" : "#FFFFFF",
  searchBorder: isDark ? "#334155" : "#CBD5E1",

  shadow: "#000000",

  primary: "#0369A1",

  NavbarbgColour: isDark ? "#0369A1" : "#1E293B",
  NavbarTextColour: "#FFFFFF",

  modalOverlay: isDark
    ? "rgba(0,0,0,0.65)"
    : "rgba(0,0,0,0.30)",

  modalCard: isDark ? "#1E293B" : "#FFFFFF",

  modalBorder: isDark ? "#334155" : "#E2E8F0",

  modalItemActive: isDark
    ? "#082F49"
    : "#E0F2FE",
};

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors,
        typography,
        toggleTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);



// import { useTheme } from '../ThemeContext';

// const { colors, isDark } = useTheme();

// <Text style={{ color: colors.text }}>
//   {isDark ? 'Dark Mode' : 'Light Mode'}
// </Text>