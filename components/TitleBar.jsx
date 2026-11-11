import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../components/ThemeContext";

const TitleBar = ({ title, Partyname }) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.titleBar, { backgroundColor: colors.card }]}>
      <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.titleText, { color: colors.text }]}>{Partyname}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  titleBar: {
    height: 30,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    // margin:8,
    // marginBottom:20,
    paddingLeft: 5,
    backgroundColor: '#cbd2da'
  },
  titleText: {
    fontSize: 15,
    fontWeight: "bold",
    padding: 5,
    height: "110%",
    color: '#483D8B'
  },
});

export default TitleBar;
