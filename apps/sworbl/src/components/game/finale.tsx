// The FINALE — 0:00 morphs the round into this: 6 Wordle-colored guesses at the
// sworb. The ENGINE decides everything: scoreGuess (dup-safe coloring),
// applySworbGuess (locking, bonus via guessReward), nextSlots (typing state
// machine: greens LOCK in place, yellows become dashed amber hints, type-over
// clears). This component renders slots and forwards keys.
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { ZoomIn, FadeIn, SlideInDown } from 'react-native-reanimated';
import engine from '@sworbl/engine';
import { INK } from '@/game/palette';
import { haptic } from '@/game/haptics';
import { applyGuess } from '@/game/finale-logic';
import { ClueFan } from './clue-fan';

const C = {
  green: { bg: '#5FD6A8', edge: '#38AD7F', ink: INK },
  yellow: { bg: '#F5B84A', edge: '#CE9022', ink: INK },
  gray: { bg: '#3A3A44', edge: '#26262E', ink: '#8A8A96' },
  typed: { bg: '#42424F', edge: '#22222A', ink: '#FFFFFF' },
};

export interface FinaleResult {
  solved: boolean;
  guessesUsed: number;
  bonus: number;
  rows: { letters: string[]; colors: string[] }[];
}

export interface FinaleRestore {
  rows: { letters: string[]; colors: string[] }[];
  slots: string[];
  colors: (string | null)[];
  guessesUsed: number;
}

interface Props {
  entry: { sworb: string }; // engine checkGuess normalizes against entry.sworb
  clues: string[]; // the 6 realized clues — the fan is your intel in here
  found: string[];
  size: number; // board tile size — finale blocks match the board's scale
  restore?: FinaleRestore; // a killed-mid-finale run picks up exactly here
  onProgress?: (s: FinaleRestore) => void; // run-snapshot feed
  onDone: (r: FinaleResult) => void;
}

export function Finale({ entry, clues, found, size, restore, onProgress, onDone }: Props) {
  const foundCount = found.length;
  const clueTotal = clues.length;
  const len = entry.sworb.length;
  const [rows, setRows] = useState<{ letters: string[]; colors: string[] }[]>(restore?.rows ?? []);
  // a restore's slot arrays are only trusted at the right length — the phase-entry
  // snapshot legitimately carries empty ones (blank-slot bug caught in browser)
  const [slots, setSlots] = useState<string[]>(
    restore?.slots?.length === len ? restore.slots : Array(len).fill('')
  );
  const [colors, setColors] = useState<(string | null)[]>(
    restore?.colors?.length === len ? restore.colors : Array(len).fill(null)
  );
  const [guessesUsed, setGuessesUsed] = useState(restore?.guessesUsed ?? 0);
  const [locked, setLocked] = useState(false);

  const keyIn = useCallback(
    (ch: string) => {
      if (locked) return;
      const next = engine.daily.nextSlots({ slots, colors, ch, len });
      if (!next) return; // full row / nothing to delete
      setSlots(next.slots);
      setColors(next.colors || Array(len).fill(null));
      haptic.soft();
    },
    [slots, colors, len, locked]
  );

  // the transition itself is PURE (finale-logic.applyGuess, contract-pinned by
  // tests) — this callback only performs the theater: state, haptics, timing
  const submit = useCallback(() => {
    if (locked) return;
    const out = applyGuess({
      slots, rows, guessesUsed, sworb: entry.sworb, foundCount, clueTotal,
    });
    if (out.kind === 'reject') {
      haptic.bad();
      return;
    }
    setRows(out.rows);
    setGuessesUsed(out.usedNow);
    if (out.kind === 'solved' || out.kind === 'lockout') {
      const solved = out.kind === 'solved';
      setLocked(true);
      haptic[solved ? 'good' : 'bad']();
      setTimeout(
        () =>
          onDone({
            solved,
            guessesUsed: out.usedNow,
            bonus: solved ? out.bonus : 0,
            rows: out.rows,
          }),
        solved ? 900 : 1600 // losers get the gray beat before the reveal
      );
      return;
    }
    // miss: greens locked, yellows hinting, grays cleared (decided in applyGuess)
    setSlots(out.slots);
    setColors(out.colors);
    onProgress &&
      onProgress({ rows: out.rows, slots: out.slots, colors: out.colors, guessesUsed: out.usedNow });
    haptic.bad();
  }, [slots, rows, guessesUsed, locked, entry, foundCount, clueTotal, onDone, onProgress]);

  const bs = Math.min(size, Math.floor(300 / len)); // block size fits the row
  const block = (letter: string, color: string | null, i: number, active: boolean) => {
    const pal = color ? C[color as keyof typeof C] : letter ? C.typed : null;
    const isHint = active && color === 'yellow';
    return (
      <View
        key={i}
        style={[
          styles.block,
          { width: bs, height: bs * 1.14, borderRadius: Math.round(bs * 0.25) },
          pal && !isHint
            ? { backgroundColor: pal.bg, boxShadow: `0 3px 0 ${pal.edge}` }
            : isHint
              ? styles.blockHint
              : styles.blockEmpty,
        ]}>
        <Text
          style={[
            styles.blockText,
            { fontSize: Math.round(bs * 0.52) },
            { color: isHint ? '#F5B84A' : pal ? pal.ink : '#9DA2B3' },
            isHint && { opacity: 0.75 },
          ]}>
          {letter.toUpperCase()}
        </Text>
      </View>
    );
  };

  const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', '⌫ZXCVBNM⏎'];

  // THE MORPH (entrance half): the board collapsed in a center-out wave
  // (game-tile exiting); slots drop in as its echo, then the keys rise
  // row-by-row with a per-key stagger. `restore` (a killed-finale re-entry)
  // skips the theater — you're resuming a moment, not re-living the morph.
  const theater = !restore;
  const D = (ms: number) => (theater ? ms : 0);
  // Reanimated's springified/slide entering animations are incomplete on WEB —
  // elements strand invisible at their initial state. Native keeps the theater.
  const E = <T,>(a: T): T | undefined => (Platform.OS === 'web' ? undefined : a);

  return (
    <Animated.View entering={E(FadeIn.duration(250).delay(D(150)))} style={styles.wrap}>
      {/* committed rows */}
      {rows.map((r, ri) => (
        <View key={ri} style={styles.row}>
          {r.letters.map((l, i) => block(l, r.colors[i], i, false))}
        </View>
      ))}
      {/* active row (hidden once locked) */}
      {!locked && (
        <Animated.View
          entering={E(ZoomIn.springify().mass(0.6).delay(D(380)))}
          style={[styles.row, styles.activeRow]}>
          {slots.map((l, i) => block(l, colors[i], i, true))}
        </Animated.View>
      )}
      {/* guess pips */}
      <Animated.View entering={E(FadeIn.delay(D(600)))} style={styles.pips}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.pip, i < guessesUsed && styles.pipUsed]} />
        ))}
      </Animated.View>
      {/* your intel: the clue fan rides into the finale (candy = found,
          ghosts = the first-letter nudges you didn't catch) */}
      <Animated.View entering={E(FadeIn.delay(D(700)))}>
        <ClueFan clues={clues} found={found} />
      </Animated.View>
      {/* keyboard — rises row-by-row, keys staggered inside each row */}
      <View style={styles.kb}>
        {KEYS.map((krow, ki) => (
          <Animated.View
            key={ki}
            entering={E(SlideInDown.springify().mass(0.55).damping(14).delay(D(430 + ki * 90)))}
            style={styles.kbRow}>
            {[...krow].map((k, kj) => {
              const wide = k === '⌫' || k === '⏎';
              return (
                <Animated.View key={k} entering={E(ZoomIn.delay(D(460 + ki * 90 + kj * 16)))}>
                  <Pressable
                    onPress={() =>
                      k === '⏎' ? submit() : keyIn(k === '⌫' ? engine.daily.BACKSPACE : k.toLowerCase())
                    }
                    style={({ pressed }) => [styles.key, wide && styles.keyWide, pressed && styles.keyDown]}>
                    <Text style={styles.keyText}>{k}</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 7 },
  row: { flexDirection: 'row', gap: 6 },
  activeRow: { marginTop: 2 },
  block: { alignItems: 'center', justifyContent: 'center' },
  blockEmpty: { borderWidth: 2.5, borderStyle: 'dashed', borderColor: '#3A3A44' },
  blockHint: { borderWidth: 2.5, borderStyle: 'dashed', borderColor: '#CE9022' },
  blockText: { fontFamily: 'Fredoka_600SemiBold', includeFontPadding: false },
  pips: { flexDirection: 'row', gap: 5, marginVertical: 6 },
  pip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a2446' },
  pipUsed: { backgroundColor: '#ff6b5a' },
  kb: { gap: 6, marginTop: 8 },
  kbRow: { flexDirection: 'row', gap: 5, justifyContent: 'center' },
  key: {
    minWidth: 30,
    height: 44,
    borderRadius: 7,
    backgroundColor: '#33333E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  keyWide: { minWidth: 44 },
  keyDown: { backgroundColor: '#42424F', transform: [{ scale: 0.94 }] },
  keyText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 15, color: '#EDEFF7' },
});
