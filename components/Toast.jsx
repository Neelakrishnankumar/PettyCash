import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  Easing,
} from 'react-native';
import { useTheme } from '../components/ThemeContext';

const PALETTES = {
  light: {
    success: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', chip: '#22C55E' },
    error:   { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', chip: '#EF4444' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', chip: '#F59E0B' },
    info:    { bg: '#FFFFFF', border: '#E5E7EB', text: '#1F2937', chip: '#3B82F6' },
  },
  dark: {
    success: { bg: '#0F2A1A', border: '#1E4A2E', text: '#86EFAC', chip: '#22C55E' },
    error:   { bg: '#2C1414', border: '#4A1E1E', text: '#FCA5A5', chip: '#EF4444' },
    warning: { bg: '#2A1F0A', border: '#4A3410', text: '#FCD34D', chip: '#F59E0B' },
    info:    { bg: '#1C1C1E', border: '#2E2E30', text: '#F2F2F7', chip: '#60A5FA' },
  },
};

const TopToast = ({
  visible,
  message,
  onHide,
  icon,
  type = 'info',
  position = 'bottom',
}) => {
  const { isDark } = useTheme();
  const palette = (isDark ? PALETTES.dark : PALETTES.light)[type] || PALETTES.light.info;

  const widthAnim = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const chipScale = useRef(new Animated.Value(0)).current;

  const timerRef = useRef(null);

  const hideToast = () => {
    Animated.sequence([
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.timing(widthAnim, {
          toValue: 56,
          duration: 380,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 380,
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 380,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      requestAnimationFrame(() => {
        onHide && onHide();
      });
    });
  };

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      widthAnim.setValue(56);
      opacity.setValue(0);
      textOpacity.setValue(0);
      scale.setValue(0.9);
      chipScale.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: false,
          }),
          Animated.spring(scale, {
            toValue: 1,
            damping: 14,
            stiffness: 140,
            mass: 1,
            useNativeDriver: false,
          }),
          Animated.spring(chipScale, {
            toValue: 1,
            damping: 9,
            stiffness: 200,
            useNativeDriver: false,
          }),
        ]),

        Animated.timing(widthAnim, {
          toValue: 300,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),

        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, 3800);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        position === 'top' ? styles.top : styles.bottom,
        {
          width: widthAnim,
          opacity,
          transform: [{ scale }],
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            transform: [{ scale: chipScale }],
          },
        ]}
      >
        {/* {icon ? ( */}
          <Animated.Image source={require("../assets/insys.png")} style={styles.iconImage} />
        {/* // ) : (
        //   <Text style={styles.chipDot}>●</Text>
        // )} */}
      </Animated.View>

      <Animated.View
        style={{
          opacity: textOpacity,
          marginLeft: 10,
          flexShrink: 1,
        }}
      >
        <Text
          numberOfLines={2}
          style={[styles.text, { color: palette.text }]}
        >
          {message}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

export default TopToast;

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    minHeight: 60,
    maxWidth: '90%',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },

    elevation: 8,
    zIndex: 9999,
    overflow: 'hidden',
  },
  top: {
    top: '6%',
  },
  bottom: {
    bottom: '10%',
  },
  chip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: 17,
    height: 17,
    resizeMode: 'contain',
    // tintColor: '#FFFFFF',
  },
  chipDot: {
    color: '#FFFFFF',
    fontSize: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});