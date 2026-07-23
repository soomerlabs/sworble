// TRACE TO PLAY (owner: "i love it") — the door handle teaches the game.
// The P·L·A·Y tiles are REAL BOARD TILES (owner round 2): the mono
// face-on-ledge candy construction at mini scale — gray like a masked board,
// igniting to candy exactly like tracing on the real thing. Pure display:
// home owns the gesture and drives sLit (0-4).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { PALETTE, INK, tileColorFor, gameSurface } from '@/game/palette';
import { type Theme } from '@/game/theme';

export const PLAY_TILE = 42;
export const PLAY_GAP = 8;
export const PLAY_WORD = ['p', 'l', 'a', 'y'] as const;
export const PLAY_ROW_W = PLAY_TILE * 4 + PLAY_GAP * 3;

const LIFT = 3; // board rule: max(3, 0.08·s) — 3 at this scale
const RAD = Math.round(PLAY_TILE * 0.2);

function PlayTile({ ch, i, sLit, theme }: {
  ch: string; i: number; sLit: SharedValue<number>; theme: Theme;
}) {
  const pal = PALETTE[tileColorFor(ch, i)];
  const gs = gameSurface(theme.mode);
  const ledgeStyle = useAnimatedStyle(() => ({
    backgroundColor: sLit.value > i ? pal.edge : gs.mono.edge,
  }));
  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: sLit.value > i ? pal.bg : gs.mono.bg,
    transform: [{ translateY: sLit.value > i ? -1 : 0 }], // the board's press-lift
  }));
  const inkStyle = useAnimatedStyle(() => ({
    color: sLit.value > i ? INK : gs.monoInk,
  }));
  return (
    <View style={styles.tileWrap}>
      <Animated.View style={[styles.ledge, ledgeStyle]} />
      <Animated.View style={[styles.face, faceStyle, { boxShadow: gs.tileBevel }]}>
        <Animated.Text style={[styles.letter, inkStyle]}>{ch.toUpperCase()}</Animated.Text>
      </Animated.View>
    </View>
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
    gap: 7,
  },
  row: {
    flexDirection: 'row',
    gap: PLAY_GAP,
  },
  tileWrap: {
    width: PLAY_TILE,
    height: PLAY_TILE + LIFT + 1,
  },
  ledge: {
    position: 'absolute',
    left: 0,
    top: LIFT,
    width: PLAY_TILE,
    height: PLAY_TILE,
    borderRadius: RAD,
  },
  face: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PLAY_TILE,
    height: PLAY_TILE,
    borderRadius: RAD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 20,
    includeFontPadding: false,
  },
  label: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
  },
});
