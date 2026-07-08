import React from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '@/constants/colors';

interface DotsProps {
  total: number;
  current: number; // 0-indexed
}

export function OnboardingDots({ total, current }: DotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    backgroundColor: C.lime,
  },
  dotInactive: {
    width: 7,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
