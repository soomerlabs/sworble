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

export const PLAY_WORD = ['p', 'l', 'a', 'y'] as const;

// BOARD-SIZE tiles (owner): the door previews the game — same sizing rule
// as the real board (play-sheet's tile formula)
export function playMetrics(width: number) {
  const tile = Math.min(64, Math.floor((Math.min(width, 480) - 32) / (5 + 4 * 0.16)));
  const gap = Math.round(tile * 0.16);
  const rowW = tile * 4 + gap * 3;
  return { tile, gap, rowW, left: (width - rowW) / 2 };
}

function PlayTile({ ch, i, sLit, theme, tile }: {
  ch: string; i: number; sLit: SharedValue<number>; theme: Theme; tile: number;
}) {
  const pal = PALETTE[tileColorFor(ch, i)];
  const gs = gameSurface(theme.mode);
  const LIFT = Math.max(3, Math.round(tile * 0.08));
  const RAD = Math.round(tile * 0.2);
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
    <View style={{ width: tile, height: tile + LIFT + 1 }}>
      <Animated.View
        style={[styles.ledge, ledgeStyle, { top: LIFT, width: tile, height: tile, borderRadius: RAD }]}
      />
      <Animated.View
        style={[
          styles.face,
          faceStyle,
          { width: tile, height: tile, borderRadius: RAD, boxShadow: gs.tileBevel },
        ]}>
        <Animated.Text style={[styles.letter, inkStyle, { fontSize: Math.round(tile * 0.5) }]}>
          {ch.toUpperCase()}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

export function TracePlay({ sLit, theme, tile, gap }: {
  sLit: SharedValue<number>; theme: Theme; tile: number; gap: number;
}) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { gap }]}>
        {PLAY_WORD.map((ch, i) => (
          <PlayTile key={ch} ch={ch} i={i} sLit={sLit} theme={theme} tile={tile} />
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
  },
  ledge: {
    position: 'absolute',
    left: 0,
  },
  face: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: 'Fredoka_600SemiBold',
    includeFontPadding: false,
  },
  label: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
  },
});
