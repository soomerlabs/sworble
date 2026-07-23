// TRACE TO PLAY (owner: "i love it") — the door handle teaches the game.
// Four dashed mini-tiles P·L·A·Y on the peek band; the player TRACES them
// (the game's core verb) and each lights candy under the finger with the
// board's haptic crescendo; the fourth launches the sheet. Swipe-up still
// works — first-movement axis decides which gesture you meant.
// Pure display: home owns the gesture and drives sLit (0-4).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { PALETTE, INK, tileColorFor } from '@/game/palette';
import { type Theme } from '@/game/theme';

export const PLAY_TILE = 40;
export const PLAY_GAP = 8;
export const PLAY_WORD = ['p', 'l', 'a', 'y'] as const;
export const PLAY_ROW_W = PLAY_TILE * 4 + PLAY_GAP * 3;

function PlayTile({ ch, i, sLit, theme }: {
  ch: string; i: number; sLit: SharedValue<number>; theme: Theme;
}) {
  const pal = PALETTE[tileColorFor(ch, i)];
  const litStyle = useAnimatedStyle(() => {
    const lit = sLit.value > i;
    return {
      backgroundColor: lit ? pal.bg : 'transparent',
      borderColor: lit ? pal.bg : theme.dashed,
      transform: [{ scale: lit ? 1.08 : 1 }],
    };
  });
  const inkStyle = useAnimatedStyle(() => ({
    color: sLit.value > i ? INK : theme.sub,
  }));
  return (
    <Animated.View style={[styles.tile, litStyle]}>
      <Animated.Text style={[styles.letter, inkStyle]}>{ch.toUpperCase()}</Animated.Text>
    </Animated.View>
  );
}

export function TracePlay({ sLit, theme }: { sLit: SharedValue<number>; theme: Theme }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {PLAY_WORD.map((ch, i) => (
          <PlayTile key={ch} ch={ch} i={i} sLit={sLit} theme={theme} />
        ))}
      </View>
      <Text style={[styles.label, { color: theme.ink }]}>trace to play</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: PLAY_GAP,
  },
  tile: {
    width: PLAY_TILE,
    height: PLAY_TILE,
    borderRadius: 11,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 19,
    includeFontPadding: false,
  },
  label: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
  },
});
