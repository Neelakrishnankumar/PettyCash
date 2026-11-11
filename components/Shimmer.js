import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, View } from "react-native";

const { width } = Dimensions.get("window");

export default function Shimmer({ height, width: w, style }) {
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <Animated.View
        style={{
          height: "100%",
          width: "30%",
          backgroundColor: "rgba(255,255,255,0.6)",
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}
