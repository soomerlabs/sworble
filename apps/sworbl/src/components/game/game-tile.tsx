// One board tile — WEB-PARITY VISUALS (extracted from the fossil's tile
// builder, index.html ~5880-6060): the board is MONO — tiles idle gray and
// LIGHT INTO CANDY only while traced ("color is earned"). The head of the
// chain lifts highest (−6%·s, scale 1.03), the rest of the chain lifts −3%·s,
// unselected tiles recede to 0.9 opacity while any chain is lit. Radius is
// 0.2·s, the ledge is max(3, 0.08·s) and DEEPENS by +1/+2 while lit.
// Construction: face-on-ledge as two views (RN has no offset-solid shadows on
// Android, and ledge COLOR must animate on the UI thread — a child view can).
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  ZoomOut,
  type SharedValue,
} from 'react-native-reanimated';
import { PALETTE, INK, MONO_DARK, MONO_INK } from '@/game/palette';
import type { TileT, TraceTile } from '@/game/types';

const FALL_SPRING = { mass: 0.7, damping: 16, stiffness: 220 };
const POP_SPRING = { mass: 0.5, damping: 12, stiffness: 320 };

interface Props {
  tile: TileT;
  size: number;
  gap: number;
  sPath: SharedValue<TraceTile[]>;
  clearing: boolean;
}

function GameTileInner({ tile, size, gap, sPath, clearing }: Props) {
  const cell = size + gap;
  const x = tile.col * cell;
  const targetY = tile.row * cell;
  const lift = Math.max(3, Math.round(size * 0.08));
  const rad = Math.round(size * 0.2);

  const y = useSharedValue(tile.spawnDrop ? -(tile.spawnDrop + 1) * cell : targetY);
  const baseScale = useSharedValue(tile.spawnDrop ? 0.6 : 1);
  const opacity = useSharedValue(tile.spawnDrop ? 0 : 1);

  useEffect(() => {
    const delay = tile.spawnDrop ? tile.spawnDrop * 40 : 0;
    y.value = withDelay(delay, withSpring(targetY, FALL_SPRING));
    baseScale.value = withDelay(delay, withSpring(1, POP_SPRING));
    opacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
  }, [targetY]);

  useEffect(() => {
    if (clearing) {
      baseScale.value = withSequence(
        withTiming(1.25, { duration: 90 }),
        withTiming(0, { duration: 140 })
      );
      opacity.value = withDelay(90, withTiming(0, { duration: 140 }));
    }
  }, [clearing]);

  const pal = PALETTE[tile.ci] || PALETTE[0];

  // lit state: 0 = mono, 1 = in the chain, 2 = the head under the finger;
  // dimmed = a chain is lit elsewhere (web: opacity 0.9 recede, letters scannable)
  const sLit = useSharedValue(0);
  const sDim = useSharedValue(false);
  const liftY = useSharedValue(0);
  const headScale = useSharedValue(1);
  useAnimatedReaction(
    () => {
      const p = sPath.value;
      if (!p.length) return 0; // 0 = no chain anywhere
      for (let i = 0; i < p.length; i++) {
        if (p[i].id === tile.id) return i === p.length - 1 ? 2 : 1;
      }
      return 3; // chain lit, not me → recede
    },
    (cur, prev) => {
      if (cur === prev) return;
      const lit = cur === 1 || cur === 2 ? cur : 0;
      sLit.value = lit;
      sDim.value = cur === 3;
      // web: instant, weightless lift — 0.1-0.12s ease, color SNAPS with the ledge
      liftY.value = withTiming(
        lit === 2 ? -Math.max(2, Math.round(size * 0.06)) : lit === 1 ? -Math.max(1, Math.round(size * 0.03)) : 0,
        { duration: 110 }
      );
      headScale.value = withTiming(lit === 2 ? 1.03 : 1, { duration: 110 });
    }
  );

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x },
      { translateY: y.value + liftY.value },
      { scale: baseScale.value },
      { scale: headScale.value },
    ],
    opacity: opacity.value * (sDim.value ? 0.9 : 1),
  }));

  // ledge: mono edge idle → candy edge while lit, deepening +1 (chain) / +2 (head)
  const ledgeStyle = useAnimatedStyle(() => ({
    backgroundColor: sLit.value ? pal.edge : MONO_DARK.edge,
    top: lift + (sLit.value === 2 ? 2 : sLit.value === 1 ? 1 : 0),
  }));
  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: sLit.value ? pal.bg : MONO_DARK.bg,
  }));
  const letterStyle = useAnimatedStyle(() => ({
    color: sLit.value ? INK : MONO_INK,
  }));

  return (
    <Animated.View
      exiting={ZoomOut.duration(230).delay(Math.round(Math.hypot(tile.col - 2, tile.row - 2.5) * 55))}
      style={[styles.wrap, wrapStyle, { width: size, height: size + lift + 2 }]}>
      <Animated.View
        style={[styles.ledge, ledgeStyle, { width: size, height: size, borderRadius: rad }]}
      />
      <Animated.View style={[styles.face, faceStyle, { width: size, height: size, borderRadius: rad }]}>
        <Animated.Text
          style={[
            styles.letter,
            letterStyle,
            { fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.62) },
          ]}>
          {tile.letter.toUpperCase()}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

// a trace-driven readout re-render in the board must never touch 30 tiles
export const GameTile = React.memo(
  GameTileInner,
  (a, b) => a.tile === b.tile && a.size === b.size && a.gap === b.gap && a.clearing === b.clearing
);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
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
    // the web face's top gloss (inset 0 2px rgba(255,255,255,0.3)) — a border
    // is the closest cross-platform approximation without inset shadows
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  letter: {
    fontFamily: 'Fredoka_600SemiBold',
    includeFontPadding: false,
  },
});
