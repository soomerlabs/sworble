// Trace connector — NATIVE, web-parity: the trail is a DOTTED colored line
// (web trailSegs: strokeDasharray '1 9', round caps, per-seg candy color,
// slight blur), not a solid stroke. Tier-2 constraint: Skia nodes can't be
// created from the UI thread, so this renders ONE dotted path whose color
// rides the chain's LAST tile (the web tip color) via a derived value.
import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Path, DashPathEffect, BlurMask } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { PALETTE } from '@/game/palette';
import type { TraceTile } from '@/game/types';

interface Props {
  sPath: SharedValue<TraceTile[]>;
  size: number;
  gap: number;
  width: number;
  height: number;
}

const PAL_BG = PALETTE.map((p) => p.bg);

export default function TraceConnector({ sPath, size, gap, width, height }: Props) {
  const cell = size + gap;
  const d = useDerivedValue(() => {
    const p = sPath.value;
    if (p.length < 2) return 'M -99 -99'; // off-board no-op (Skia rejects '')
    let s = '';
    for (let i = 0; i < p.length; i++) {
      const x = p[i].col * cell + size / 2, y = p[i].row * cell + size / 2;
      s += (i === 0 ? 'M' : 'L') + x + ' ' + y + ' ';
    }
    return s;
  });
  // tip color, web-style: the chain glows in the LAST tile's candy
  const color = useDerivedValue(() => {
    const p = sPath.value;
    return p.length ? PAL_BG[p[p.length - 1].ci % PAL_BG.length] : PAL_BG[0];
  });
  return (
    <Canvas pointerEvents="none" style={[StyleSheet.absoluteFill, { width, height }]}>
      <Path
        path={d}
        style="stroke"
        color={color}
        opacity={0.55}
        strokeWidth={Math.max(6, size * 0.13)}
        strokeCap="round"
        strokeJoin="round">
        <DashPathEffect intervals={[1, 9]} />
        <BlurMask blur={1.5} style="normal" />
      </Path>
    </Canvas>
  );
}
