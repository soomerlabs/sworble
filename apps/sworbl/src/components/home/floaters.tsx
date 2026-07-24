// Drifting background tiles — the v18 FLOATERS table verbatim from the web app:
// heavy at the edges, sparse + dimmer in the middle (the `o` opacity override).
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { PALETTE } from '@/game/palette';

const FLOATERS = [
  { x: 4, y: 12, s: 26, c: 0, d: 13 }, { x: 9, y: 34, s: 16, c: 2, d: 17 },
  { x: 3, y: 58, s: 34, c: 1, d: 15 }, { x: 11, y: 80, s: 20, c: 4, d: 19 },
  { x: 91, y: 9, s: 22, c: 3, d: 16 }, { x: 95, y: 30, s: 30, c: 5, d: 14 },
  { x: 89, y: 55, s: 16, c: 0, d: 18 }, { x: 94, y: 78, s: 26, c: 2, d: 13.5 },
  { x: 22, y: 5, s: 14, c: 5, d: 16.5 }, { x: 74, y: 4, s: 18, c: 1, d: 15.5 },
  { x: 30, y: 92, s: 16, c: 3, d: 17.5 }, { x: 68, y: 94, s: 22, c: 0, d: 14.5 },
  { x: 47, y: 36, s: 15, c: 2, d: 28, o: 0.5 }, { x: 40, y: 63, s: 13, c: 4, d: 25, o: 0.45 },
  { x: 58, y: 20, s: 12, c: 1, d: 30, o: 0.4 },
];

function Floater({ f, width, height }: { f: (typeof FLOATERS)[number]; width: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: (f.d * 1000) / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: t.value * -12 }, { rotate: `${t.value * 8 - 4}deg` }],
  }));
  const pal = PALETTE[f.c];
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        anim,
        styles.tile,
        {
          left: (f.x / 100) * width,
          top: (f.y / 100) * height,
          width: f.s,
          height: f.s,
          borderRadius: Math.round(f.s * 0.27), borderCurve: 'continuous',
          backgroundColor: pal.bg,
          opacity: 0.16 * (f.o ?? 1),
        },
      ]}
    />
  );
}

export function Floaters({ width, height }: { width: number; height: number }) {
  return (
    <>
      {FLOATERS.map((f, i) => (
        <Floater key={i} f={f} width={width} height={height} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
  },
});
