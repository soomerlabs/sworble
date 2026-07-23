// The COUNT-IN, redesigned (owner): board letters stay MASKED while candy
// NUMBER BLOCKS pop — 3, 2, 1 — and there is NO "GO" card. At the GO beat
// the overlay dies and the BOARD ITSELF turns on (shockwave + radial letter
// wake, owned by the board). Beat timing still comes from the ENGINE
// (COUNT_IN_MS + countInStepAt) — this component only renders the beats.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  ZoomIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import engine from '@sworbl/engine';
import { PALETTE, INK, GAME_DARK, type GameSurface } from '@/game/palette';
import { haptic } from '@/game/haptics';
import { getCountInStall } from '@/game/dev-flags';
import { countInTick } from '@/game/count-in-tick';

interface Props {
  onRelease: () => void; // board unlocks + wakes (engine GO beat)
  onUnmount: () => void;
  gs?: GameSurface;
}

// 3 violet · 2 gold · 1 green — green hands off to the board turning on
const BEAT_PAL: Record<string, number> = { '3': 0, '2': 4, '1': 2 };

export function CountIn({ onRelease, onUnmount, gs = GAME_DARK }: Props) {
  const [step, setStep] = useState<string>('3');
  const [out, setOut] = useState(false);
  // the dim ARRIVES and LEAVES softly — the old `out` was an instant style
  // swap (audit: unanimated state change)
  const sDim = useSharedValue(0);
  useEffect(() => {
    sDim.value = withTiming(out ? 0 : 1, { duration: out ? 160 : 140 });
  }, [out]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: sDim.value }));

  // each beat TAPS (owner): 3·2·1 soft ticks — GO's heavier thump belongs to
  // the board's wake (game-board fires haptic.good when concealment lifts)
  useEffect(() => {
    haptic.soft();
  }, [step]);

  useEffect(() => {
    // DRIFT-CORRECTED beats (owner: "not in perfect sync"): timeout chains
    // fire late under JS-thread load and the error compounds per beat. One
    // anchored clock instead — every tick derives the step from TRUE elapsed
    // time, so a late tick self-corrects instead of accumulating.
    const MS = engine.run.COUNT_IN_MS;
    const t0 = Date.now();
    let released = false;
    // DEV stress: busy-block the JS thread across the GO beat (freeze repro)
    if (getCountInStall()) {
      setTimeout(() => {
        const until = Date.now() + 900;
        while (Date.now() < until) {
          /* deliberate stall */
        }
      }, MS.GO - 200);
    }
    const h = setInterval(() => {
      const t = countInTick(Date.now() - t0, MS);
      if (t.release && !released) {
        released = true;
        setOut(true);
        onRelease();
      }
      if (t.done) {
        clearInterval(h);
        onUnmount();
        return;
      }
      if (t.step) setStep(t.step);
    }, 40);
    return () => clearInterval(h);
  }, []);

  const pal = PALETTE[BEAT_PAL[step] ?? 0];

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: gs.overlay }, dimStyle]}>
      {!out && (
        <Animated.View
          key={step}
          entering={ZoomIn.springify().mass(0.6).damping(12)}
          exiting={FadeOut.duration(120)}
          style={[
            styles.block,
            { backgroundColor: pal.bg, boxShadow: `0 7px 0 ${pal.edge}` },
          ]}>
          <Text style={styles.digit}>{step}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    zIndex: 10,
  },
  block: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 54,
    color: INK,
    includeFontPadding: false,
  },
});
