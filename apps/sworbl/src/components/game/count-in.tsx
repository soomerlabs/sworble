// The COUNT-IN, redesigned (owner): board letters stay MASKED while candy
// NUMBER BLOCKS pop — 3, 2, 1 — and there is NO "GO" card. At the GO beat
// the overlay dies and the BOARD ITSELF turns on (shockwave + radial letter
// wake, owned by the board). Beat timing still comes from the ENGINE
// (COUNT_IN_MS + countInStepAt) — this component only renders the beats.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { ZoomIn, FadeOut } from 'react-native-reanimated';
import engine from '@sworbl/engine';
import { PALETTE, INK } from '@/game/palette';

interface Props {
  onRelease: () => void; // board unlocks + wakes (engine GO beat)
  onUnmount: () => void;
}

// 3 violet · 2 gold · 1 green — green hands off to the board turning on
const BEAT_PAL: Record<string, number> = { '3': 0, '2': 4, '1': 2 };

export function CountIn({ onRelease, onUnmount }: Props) {
  const [step, setStep] = useState<string>('3');
  const [out, setOut] = useState(false);

  useEffect(() => {
    // DRIFT-CORRECTED beats (owner: "not in perfect sync"): timeout chains
    // fire late under JS-thread load and the error compounds per beat. One
    // anchored clock instead — every tick derives the step from TRUE elapsed
    // time, so a late tick self-corrects instead of accumulating.
    const MS = engine.run.COUNT_IN_MS;
    const t0 = Date.now();
    let released = false;
    const h = setInterval(() => {
      const el = Date.now() - t0;
      if (el >= MS.GO + 400) {
        clearInterval(h);
        onUnmount();
        return;
      }
      if (el >= MS.GO) {
        // the GO beat: no card — the overlay clears and the BOARD wakes
        if (!released) {
          released = true;
          setOut(true);
          onRelease();
        }
        return;
      }
      setStep(el >= MS.STEP1 ? '1' : el >= MS.STEP2 ? '2' : '3');
    }, 40);
    return () => clearInterval(h);
  }, []);

  const pal = PALETTE[BEAT_PAL[step] ?? 0];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, out && styles.out]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,16,20,0.55)',
    borderRadius: 18,
    zIndex: 10,
  },
  out: {
    opacity: 0, // GO → the overlay vanishes; the board's shockwave takes over
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
