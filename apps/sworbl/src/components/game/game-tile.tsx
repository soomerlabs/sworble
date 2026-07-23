// One board tile — WEB-PARITY VISUALS + MOTION (fossil tile builder):
//   • MONO board: tiles idle gray, LIGHT INTO CANDY only while traced.
//   • GRAVITY fall (web: cubic-bezier(0.45,0.02,0.7,0.5), dur = dist/1200s
//     clamped 0.28-0.55) with the landing SQUASH (scaleY 0.85 → back).
//   • NOPE: rejected words shake red in place (web nopeTiles).
//   • Structure: OUTER view carries the layout `exiting` (the morph); INNER
//     carries animated transforms — Reanimated forbids both on one node.
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  ZoomOut,
  type SharedValue,
} from 'react-native-reanimated';
import { PALETTE, INK, MONO_DARK, MONO_INK } from '@/game/palette';
import type { TileT, TraceTile } from '@/game/types';

const FALL_EASE = Easing.bezier(0.45, 0.02, 0.7, 0.5); // accelerate, hard stop

interface Props {
  tile: TileT;
  size: number;
  gap: number;
  sPath: SharedValue<TraceTile[]>;
  clearing: boolean;
  nope: number; // increments per rejected word this tile was part of
}

function GameTileInner({ tile, size, gap, sPath, clearing, nope }: Props) {
  const cell = size + gap;
  const x = tile.col * cell;
  const targetY = tile.row * cell;
  const lift = Math.max(3, Math.round(size * 0.08));
  const rad = Math.round(size * 0.2);

  const y = useSharedValue(tile.spawnDrop ? -(tile.spawnDrop + 1) * cell : targetY);
  const scale = useSharedValue(1);
  const squashY = useSharedValue(1);
  const opacity = useSharedValue(1);

  // gravity: duration from distance (web formula), squash on landing
  useEffect(() => {
    const dist = Math.abs(targetY - y.value);
    if (dist < 1) return;
    const dur = Math.max(280, Math.min(550, (dist / 1200) * 1000));
    const delay = tile.spawnDrop ? tile.spawnDrop * 40 : tile.col * 20;
    y.value = withDelay(
      delay,
      withTiming(targetY, { duration: dur, easing: FALL_EASE }, (fin) => {
        'worklet';
        if (fin) {
          squashY.value = withSequence(
            withTiming(0.85, { duration: 60 }),
            withTiming(1, { duration: 110 })
          );
        }
      })
    );
  }, [targetY]);

  useEffect(() => {
    if (clearing) {
      scale.value = withSequence(
        withTiming(1.25, { duration: 90 }),
        withTiming(0, { duration: 140 })
      );
      opacity.value = withDelay(90, withTiming(0, { duration: 140 }));
    }
  }, [clearing]);

  // NOPE (web nopeTiles): shake it off red — face floods red, quick recoil
  const shakeX = useSharedValue(0);
  const sNope = useSharedValue(0);
  useEffect(() => {
    if (!nope) return;
    const dx = Math.max(3, Math.round(size * 0.07));
    shakeX.value = withSequence(
      withTiming(-dx, { duration: 45 }),
      withTiming(dx, { duration: 70 }),
      withTiming(-dx * 0.6, { duration: 60 }),
      withTiming(0, { duration: 80 })
    );
    sNope.value = withSequence(
      withTiming(1, { duration: 40 }),
      withTiming(1, { duration: 240 }),
      withTiming(0, { duration: 260 })
    );
  }, [nope]);

  const pal = PALETTE[tile.ci] || PALETTE[0];

  // lit: 0 mono · 1 chain · 2 head; dimmed while a chain is lit elsewhere
  const sLit = useSharedValue(0);
  const sDim = useSharedValue(false);
  const liftY = useSharedValue(0);
  const headScale = useSharedValue(1);
  useAnimatedReaction(
    () => {
      const p = sPath.value;
      if (!p.length) return 0;
      for (let i = 0; i < p.length; i++) {
        if (p[i].id === tile.id) return i === p.length - 1 ? 2 : 1;
      }
      return 3;
    },
    (cur, prev) => {
      if (cur === prev) return;
      const lit = cur === 1 || cur === 2 ? cur : 0;
      sLit.value = lit;
      sDim.value = cur === 3;
      liftY.value = withTiming(
        lit === 2 ? -Math.max(2, Math.round(size * 0.06)) : lit === 1 ? -Math.max(1, Math.round(size * 0.03)) : 0,
        { duration: 110 }
      );
      headScale.value = withTiming(lit === 2 ? 1.03 : 1, { duration: 110 });
    }
  );

  const inner = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + shakeX.value },
      { translateY: y.value + liftY.value },
      { scale: scale.value },
      { scale: headScale.value },
      { scaleY: squashY.value },
    ],
    opacity: opacity.value * (sDim.value ? 0.9 : 1),
  }));

  const ledgeStyle = useAnimatedStyle(() => ({
    backgroundColor: sNope.value > 0.5 ? '#8C2328' : sLit.value ? pal.edge : MONO_DARK.edge,
    top: lift + (sLit.value === 2 ? 2 : sLit.value === 1 ? 1 : 0),
  }));
  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: sNope.value > 0.5 ? '#E5484D' : sLit.value ? pal.bg : MONO_DARK.bg,
  }));
  const letterStyle = useAnimatedStyle(() => ({
    color: sNope.value > 0.5 ? '#FFFFFF' : sLit.value ? INK : MONO_INK,
  }));

  // OUTER: layout exiting only (the morph's center-out collapse) — INNER: transforms
  return (
    <Animated.View
      exiting={ZoomOut.duration(230).delay(Math.round(Math.hypot(tile.col - 2, tile.row - 2.5) * 55))}
      style={styles.outer}>
      <Animated.View style={[inner, { width: size, height: size + lift + 2 }]}>
        <Animated.View
          style={[styles.ledge, ledgeStyle, { width: size, height: size, borderRadius: rad }]}
        />
        <Animated.View
          style={[styles.face, faceStyle, { width: size, height: size, borderRadius: rad }]}>
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
    </Animated.View>
  );
}

// a trace-driven readout re-render in the board must never touch 30 tiles
export const GameTile = React.memo(
  GameTileInner,
  (a, b) =>
    a.tile === b.tile && a.size === b.size && a.gap === b.gap && a.clearing === b.clearing && a.nope === b.nope
);

const styles = StyleSheet.create({
  outer: {
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
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  letter: {
    fontFamily: 'Fredoka_600SemiBold',
    includeFontPadding: false,
  },
});
