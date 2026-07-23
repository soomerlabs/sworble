// The FINALE — 0:00 morphs the round into this: 6 Wordle-colored guesses at the
// sworb. The ENGINE decides everything: scoreGuess (dup-safe coloring),
// applySworbGuess (locking, bonus via guessReward), nextSlots (typing state
// machine: greens LOCK in place, yellows become dashed amber hints, type-over
// clears). This component renders slots and forwards keys.
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { ZoomIn, FadeIn, SlideInDown } from 'react-native-reanimated';
import engine from '@sworbl/engine';
import { INK } from '@/game/palette';
import { haptic } from '@/game/haptics';
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
  const [slots, setSlots] = useState<string[]>(restore?.slots ?? Array(len).fill(''));
  const [colors, setColors] = useState<(string | null)[]>(restore?.colors ?? Array(len).fill(null));
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

  const submit = useCallback(() => {
    if (locked) return;
    const word = slots.join('');
    if (word.length < len || slots.some((s) => !s)) {
      haptic.bad();
      return;
    }
    const res = engine.daily.applySworbGuess({
      entry,
      input: word,
      guessesUsed,
      solved: false,
      foundCount,
      total: clueTotal,
    });
    if (!res.ok) return;
    // narrow the engine's optional result fields once, use everywhere below
    const usedNow = res.newGuessesUsed ?? guessesUsed + 1;
    const nowSolved = !!res.nowSolved;
    const lockedOut = !!res.lockedOut;
    const bonus = res.bonus ?? 0;
    const rowColors: string[] = engine.daily.scoreGuess(word, entry.sworb);
    const newRows = [...rows, { letters: slots.slice(), colors: rowColors }];
    setRows(newRows);
    setGuessesUsed(usedNow);
    if (nowSolved || lockedOut) {
      setLocked(true);
      haptic[nowSolved ? 'good' : 'bad']();
      setTimeout(
        () => onDone({ solved: nowSolved, guessesUsed: usedNow, bonus, rows: newRows }),
        nowSolved ? 900 : 1600 // losers get the gray beat before the reveal
      );
      return;
    }
    // miss: greens LOCK in place, yellows persist as dashed hints, grays clear
    // to empty NOW (mock case 6) — nextSlots expects exactly this shape
    const nSlots = slots.map((l, i) => (rowColors[i] === 'gray' ? '' : l));
    const nColors = rowColors.map((c) => (c === 'gray' ? null : c));
    setSlots(nSlots);
    setColors(nColors);
    onProgress &&
      onProgress({ rows: newRows, slots: nSlots, colors: nColors, guessesUsed: usedNow });
    haptic.bad();
  }, [slots, colors, rows, guessesUsed, locked, entry, foundCount, clueTotal, len, onDone]);

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
            ? { backgroundColor: pal.bg, shadowColor: pal.edge, ...styles.blockSolid }
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

  return (
    <Animated.View entering={FadeIn.duration(250).delay(D(150))} style={styles.wrap}>
      {/* committed rows */}
      {rows.map((r, ri) => (
        <View key={ri} style={styles.row}>
          {r.letters.map((l, i) => block(l, r.colors[i], i, false))}
        </View>
      ))}
      {/* active row (hidden once locked) */}
      {!locked && (
        <Animated.View
          entering={ZoomIn.springify().mass(0.6).delay(D(380))}
          style={[styles.row, styles.activeRow]}>
          {slots.map((l, i) => block(l, colors[i], i, true))}
        </Animated.View>
      )}
      {/* guess pips */}
      <Animated.View entering={FadeIn.delay(D(600))} style={styles.pips}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.pip, i < guessesUsed && styles.pipUsed]} />
        ))}
      </Animated.View>
      {/* your intel: the clue fan rides into the finale (candy = found,
          ghosts = the first-letter nudges you didn't catch) */}
      <Animated.View entering={FadeIn.delay(D(700))}>
        <ClueFan clues={clues} found={found} />
      </Animated.View>
      {/* keyboard — rises row-by-row, keys staggered inside each row */}
      <View style={styles.kb}>
        {KEYS.map((krow, ki) => (
          <Animated.View
            key={ki}
            entering={SlideInDown.springify().mass(0.55).damping(14).delay(D(430 + ki * 90))}
            style={styles.kbRow}>
            {[...krow].map((k, kj) => {
              const wide = k === '⌫' || k === '⏎';
              return (
                <Animated.View key={k} entering={ZoomIn.delay(D(460 + ki * 90 + kj * 16))}>
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
  blockSolid: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
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
