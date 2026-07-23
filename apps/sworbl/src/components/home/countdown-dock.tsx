// The bottom dock: unplayed → bobbing chevron + "swipe to play" over the brewing
// storm; played → the next-puzzle countdown (engine msToNextDay, H:MM:SS).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import engine from '@sworbl/engine';
import { type SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/game/theme';
import { TracePlay } from './trace-play';

function nextIn(): string {
  const ms = engine.core.msToNextDay(new Date());
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function CountdownDock({ played, sLit }: { played: boolean; sLit?: SharedValue<number> }) {
  const theme = useTheme();
  const [clock, setClock] = useState(nextIn);
  useEffect(() => {
    if (!played) return;
    const h = setInterval(() => setClock(nextIn()), 1000);
    return () => clearInterval(h);
  }, [played]);

  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value * -7 }],
    opacity: 0.55 + bob.value * 0.45,
  }));

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {played ? (
        <View key="count" style={styles.face}>
          {/* just the clock (owner) — the countdown IS the message */}
          <Text style={[styles.nextClock, { color: theme.ink }]}>{clock}</Text>
        </View>
      ) : (
        <View key="trace" style={styles.face}>
          {sLit ? (
            // TRACE TO PLAY — the launch IS the game's first trace (owner)
            <TracePlay sLit={sLit} theme={theme} />
          ) : (
            <>
              <Animated.Text style={[styles.chev, bobStyle]}>︿</Animated.Text>
              <Text style={[styles.swipeLabel, { color: theme.ink }]}>swipe up to play</Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 2,
  },
  face: {
    alignItems: 'center',
    gap: 2,
  },
  chev: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 26,
    color: '#8971FF',
    lineHeight: 30,
  },
  swipeLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: '#9DA2B3',
  },
  nextClock: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 26,
    color: '#EDEFF7',
    fontVariant: ['tabular-nums'],
  },
});
