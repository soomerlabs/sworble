// Trace connector — WEB: react-native-svg polyline fed by a JS-side mirror of
// the path (web has no UI-thread split; PHASE2 #7 keeps Skia WASM out of the
// web bundle). Receives the mirrored path as a plain prop.
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';
import { PALETTE } from '@/game/palette';
import type { TraceTile } from '@/game/types';

interface Props {
  sPath: SharedValue<TraceTile[]>;
  jsPath?: TraceTile[]; // web mirror (set by the board's trace reaction)
  size: number;
  gap: number;
  width: number;
  height: number;
}

export default function TraceConnector({ jsPath, size, gap, width, height }: Props) {
  const p = jsPath || [];
  if (p.length < 2) return null;
  const cell = size + gap;
  const points = p
    .map((t) => `${t.col * cell + size / 2},${t.row * cell + size / 2}`)
    .join(' ');
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={PALETTE[p[p.length - 1].ci % PALETTE.length].bg}
        strokeOpacity={0.55}
        strokeWidth={Math.max(6, size * 0.13)}
        strokeDasharray="1 9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
