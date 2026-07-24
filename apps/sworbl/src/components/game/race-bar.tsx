// THE GHOST RACE BAR (modes-spec ghost duels) — two thin fills chasing the
// same rail: you in accent, the ghost in its poster's candy. Widths are
// UI-thread tweens off plain number props that change at most once per
// landed word — no per-frame JS. The lead swaps a subtle edge glow.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ACCENT, type Theme } from '@/game/theme';

const GHOST_C = '#F58FB8'; // the charged pink — the opponent's lane

function RaceBarInner({
  theme, width, you, ghost, ghostName, ceiling,
}: {
  theme: Theme;
  width: number;
  you: number;
  ghost: number;
  ghostName: string;
  ceiling: number; // max(final ghost score, live you) — the shared rail
}) {
  const denom = Math.max(1, ceiling);
  const youW = useAnimatedStyle(() => ({
    width: withTiming(Math.min(1, you / denom) * width, { duration: 420 }),
  }));
  const ghostW = useAnimatedStyle(() => ({
    width: withTiming(Math.min(1, ghost / denom) * width, { duration: 420 }),
  }));
  const leading = you >= ghost;
  return (
    <View style={[styles.wrap, { width }]}>
      <View style={styles.laneRow}>
        <Text style={[styles.laneLabel, { color: leading ? ACCENT : theme.faint }]}>you</Text>
        <Text style={[styles.laneScore, { color: theme.ink }]}>{you.toLocaleString()}</Text>
      </View>
      <View style={[styles.lane, { backgroundColor: theme.pill }]}>
        <Animated.View style={[styles.fill, { backgroundColor: ACCENT }, youW]} />
      </View>
      <View style={[styles.lane, { backgroundColor: theme.pill }]}>
        <Animated.View style={[styles.fill, { backgroundColor: GHOST_C }, ghostW]} />
      </View>
      <View style={styles.laneRow}>
        <Text style={[styles.laneLabel, { color: !leading ? GHOST_C : theme.faint }]} numberOfLines={1}>
          {ghostName.toLowerCase()}
        </Text>
        <Text style={[styles.laneScore, { color: theme.sub }]}>{ghost.toLocaleString()}</Text>
      </View>
    </View>
  );
}

// one re-render per landed word, not per clock tick (audit)
export const RaceBar = React.memo(RaceBarInner);

const styles = StyleSheet.create({
  wrap: { gap: 3, marginBottom: 8 },
  laneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  laneLabel: { fontFamily: 'Fredoka_600SemiBold', fontSize: 10.5, letterSpacing: 1 },
  laneScore: { fontFamily: 'Fredoka_600SemiBold', fontSize: 11, fontVariant: ['tabular-nums'] },
  lane: {
    height: 5,
    borderRadius: 999, borderCurve: 'continuous',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999, borderCurve: 'continuous',
  },
});
