import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { C } from '@/constants/colors';

type Variant = 'primary' | 'ghost' | 'dark';

interface ButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  variant?: Variant;
  accentColor?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  accentColor = C.lime,
  disabled,
  loading,
  style,
}: ButtonProps) {
  const bg =
    variant === 'ghost'
      ? 'transparent'
      : variant === 'dark'
        ? C.surf2
        : accentColor;

  const textColor =
    variant === 'ghost'
      ? C.text
      : variant === 'dark'
        ? C.text
        : C.dark;

  const borderColor = variant === 'ghost' ? C.line : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor, opacity: pressed || disabled ? 0.7 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
  },
});
