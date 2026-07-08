import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/constants/colors';

interface ProgressRingProps {
  progress: number; // 0–1
  size?: number;
  color?: string;
  children?: React.ReactNode;
}

/**
 * Circular progress ring drawn with two rotated half-circles (no SVG needed).
 */
export function ProgressRing({ progress, size = 112, color = C.lime, children }: ProgressRingProps) {
  const strokeWidth = Math.round(size * 0.115);
  const innerSize = size - strokeWidth * 2;
  const deg = progress * 360;

  // Right half covers 0–180°; left half covers 180–360°.
  // Both start "empty" (rotated so the filled border faces away) and rotate into view.
  const rightDeg = Math.min(deg, 180);
  const leftDeg = Math.max(deg - 180, 0);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'rgba(255,255,255,0.10)',
          },
        ]}
      />

      {/* Right half (clip left side) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { overflow: 'hidden', left: size / 2 },
        ]}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            position: 'absolute',
            right: 0,
            transform: [{ rotate: `${rightDeg - 180}deg` }],
          }}
        />
      </View>

      {/* Left half (clip right side), only visible when >180° */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { overflow: 'hidden', right: size / 2 },
        ]}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: leftDeg > 0 ? color : 'transparent',
            position: 'absolute',
            left: 0,
            transform: [{ rotate: `${leftDeg - 180}deg` }],
          }}
        />
      </View>

      {/* Inner surface */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: C.surf,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function RingLabel({
  value,
  unit,
  color = C.lime,
}: {
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <Text style={{ fontFamily: 'Sora_800ExtraBold', fontSize: 22, color, lineHeight: 26 }}>
      {value}
      {unit && <Text style={{ fontSize: 13 }}>{unit}</Text>}
    </Text>
  );
}
