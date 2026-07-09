import React from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { TrendDay } from '@/hooks/useTrend30j';

interface Props {
  data: TrendDay[];
  color: string;
  height?: number;
}

export function SpendingChart({ data, color, height = 72 }: Props) {
  const { width: winW } = useWindowDimensions();
  // scrollContent paddingH (20×2) + Card padding (18×2) = 76
  const w = winW - 76;

  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.total), 1);

  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: height * 0.88 - (d.total / maxVal) * height * 0.82,
  }));

  // Smooth cubic bezier through all points
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
    line += ` C ${cx} ${pts[i - 1].y.toFixed(1)} ${cx} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  const area = `${line} L ${last.x.toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <Svg width={w} height={height}>
      <Defs>
        <LinearGradient id="spending-grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#spending-grad)" />
      <Path
        d={line}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
