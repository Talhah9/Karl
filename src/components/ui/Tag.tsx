import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/constants/colors';

type TagVariant = 'lime' | 'warm' | 'purple' | 'muted';

interface TagProps {
  children: React.ReactNode;
  variant?: TagVariant;
}

export function Tag({ children, variant = 'lime' }: TagProps) {
  return (
    <View style={[styles.base, styles[`bg_${variant}`]]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  text: {
    fontFamily: 'SpaceMono_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 9.5,
  },
  bg_lime: { backgroundColor: 'rgba(196,245,66,0.15)' },
  bg_warm: { backgroundColor: 'rgba(255,122,77,0.16)' },
  bg_purple: { backgroundColor: 'rgba(167,139,250,0.16)' },
  bg_muted: { backgroundColor: C.surf2 },
  text_lime: { color: C.lime },
  text_warm: { color: C.warm },
  text_purple: { color: C.purple },
  text_muted: { color: C.muted },
});
