import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { C } from '@/constants/colors';

type CardVariant = 'default' | 'hero' | 'purple';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  default: {
    backgroundColor: C.surf,
    borderColor: C.line,
  },
  hero: {
    backgroundColor: C.lime,
    borderColor: 'transparent',
  },
  purple: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderColor: 'rgba(167,139,250,0.28)',
  },
});
