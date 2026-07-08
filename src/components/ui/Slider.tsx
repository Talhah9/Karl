import React, { useRef } from 'react';
import { PanResponder, StyleSheet, View, ViewStyle } from 'react-native';
import { C } from '@/constants/colors';

interface SliderProps {
  style?: ViewStyle;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  value: number;
  onValueChange: (v: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

export function Slider({
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  value,
  onValueChange,
  minimumTrackTintColor = C.lime,
  maximumTrackTintColor = 'rgba(255,255,255,0.10)',
  thumbTintColor = C.lime,
}: SliderProps) {
  const trackWidth = useRef(0);

  function clampToStep(raw: number) {
    const clamped = Math.max(minimumValue, Math.min(maximumValue, raw));
    const stepped = Math.round((clamped - minimumValue) / step) * step + minimumValue;
    return Math.round(stepped * 100) / 100;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        if (trackWidth.current === 0) return;
        const x = e.nativeEvent.locationX;
        const pct = Math.max(0, Math.min(1, x / trackWidth.current));
        onValueChange(clampToStep(minimumValue + pct * (maximumValue - minimumValue)));
      },
      onPanResponderMove: (e) => {
        if (trackWidth.current === 0) return;
        const x = e.nativeEvent.locationX;
        const pct = Math.max(0, Math.min(1, x / trackWidth.current));
        onValueChange(clampToStep(minimumValue + pct * (maximumValue - minimumValue)));
      },
    })
  ).current;

  const pct = (value - minimumValue) / (maximumValue - minimumValue);

  return (
    <View
      style={styles.wrapper}
      {...panResponder.panHandlers}
      onLayout={(e) => {
        trackWidth.current = e.nativeEvent.layout.width;
      }}
    >
      {/* Track */}
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%`, backgroundColor: minimumTrackTintColor },
          ]}
        />
      </View>
      {/* Thumb */}
      <View
        style={[
          styles.thumb,
          {
            left: `${pct * 100}%`,
            backgroundColor: thumbTintColor,
            shadowColor: thumbTintColor,
          },
        ]}
      />
    </View>
  );
}

const THUMB = 26;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
  },
  track: {
    height: 9,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: -(THUMB / 2),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
});
