// THE WAKE SHOCKWAVE — the board "turns on": one ring blasts out from the
// board's center as the letters stamp in radially (the tiles own their own
// stagger; this is just the pulse). Keyed remount per wake.
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { ACCENT } from '@/game/theme';

export function Shockwave({ width, height }: { width: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
  }, []);
  const d = Math.min(width, height) * 0.4;
  const st = useAnimatedStyle(() => ({
    transform: [{ scale: 0.25 + t.value * 2.4 }],
    opacity: t.value < 0.12 ? t.value / 0.12 : 1 - (t.value - 0.12) / 0.88,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring, st,
        {
          width: d, height: d, borderRadius: d / 2,
          left: (width - d) / 2, top: (height - d) / 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: ACCENT,
    boxShadow: `0 0 18px 2px rgba(137,113,255,0.45)`,
    zIndex: 5,
  },
});
