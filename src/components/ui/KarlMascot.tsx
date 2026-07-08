import React from 'react';
import { StyleSheet, View } from 'react-native';

interface KarlMascotProps {
  size?: number;
  color?: string;
  smug?: boolean;
}

export function KarlMascot({ size = 46, color = '#c4f542', smug = false }: KarlMascotProps) {
  const eyeTop = size * 0.34;
  const eyeWidth = size * 0.13;
  const eyeHeight = smug ? size * 0.14 : size * 0.22;
  const eyeTopSmug = smug ? size * 0.38 : size * 0.34;

  return (
    <View
      style={[
        styles.karl,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size * 0.44,
          shadowColor: color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
    >
      {/* Left eye */}
      <View
        style={{
          position: 'absolute',
          top: eyeTopSmug,
          left: size * 0.27,
          width: eyeWidth,
          height: eyeHeight,
          backgroundColor: '#141210',
          borderRadius: eyeWidth / 2,
        }}
      />
      {/* Right eye */}
      <View
        style={{
          position: 'absolute',
          top: eyeTop,
          right: size * 0.27,
          width: eyeWidth,
          height: eyeHeight,
          backgroundColor: '#141210',
          borderRadius: eyeWidth / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  karl: {
    position: 'relative',
  },
});
