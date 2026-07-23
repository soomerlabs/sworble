// EVERY WORD (handoff 13a) — the day's full hunt, told on a mini replay
// board: every word you spelled, clues starred, tap a row to trace its path
// on the board (solver-proven; refill-born words that never lived on the
// dealt board shake instead — honest, like everything else here).
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import engine from '@sworbl/engine';

import { ScreenBar } from '@/components/screen-bar';
import { ScreenHeader } from '@/components/screen-header';
import { DevFlash } from '@/components/game/dev-clue-audit';
import { useTheme, ACCENT, CLUE_GREEN } from '@/game/theme';
import { gameSurface } from '@/game/palette';
import { dealDaily } from '@/game/daily';
import { loadDay, loadDayWords, type BestWord } from '@/game/persist';
import { COLS, ROWS } from '@/game/types';

export default function WordsScreen() {
  const theme = useTheme();
  const gs = gameSurface(theme.mode);
  const deal = useMemo(() => dealDaily(), []);
  const day = useMemo(() => (deal ? loadDay(deal.dayKey) : null), [deal]);
  const words = useMemo<BestWord[]>(
    () => (deal ? [...loadDayWords(deal.dayKey)].sort((a, b) => b.pts - a.pts) : []),
    [deal]
  );
  const found = day?.found ?? [];

  // the mini replay board: today's DEALT tiles, mono, read-only
  const miniTile = 40;
  const miniGap = 5;
  const cell = miniTile + miniGap;
  const boardW = COLS * cell - miniGap;

  const [flash, setFlash] = useState<{ key: number; cells: { col: number; row: number }[] } | null>(null);
  const [deadRow, setDeadRow] = useState<string | null>(null);
  const flashKey = React.useRef(0);
  const traceWord = useCallback(
    (w: string) => {
      if (!deal) return;
      const path = engine.solver.findWord(deal.tiles, {
        word: w,
        expand: engine.core.expandLetter,
        diag: true,
      }) as number[] | null;
      if (!path) {
        setDeadRow(w); // born of a refill — it never lived on the dealt board
        setTimeout(() => setDeadRow(null), 900);
        return;
      }
      const cells = path
        .map((id) => deal.tiles.find((t) => t.id === id))
        .filter(Boolean)
        .map((t) => ({ col: t!.col, row: t!.row }));
      setFlash({ key: ++flashKey.current, cells });
    },
    [deal]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe}>
        <ScreenBar theme={theme} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader theme={theme} eyebrow="TODAY'S HUNT" title="every word" />
          <Text style={[styles.sub, { color: theme.sub }]}>
            {words.length} found · tap one to trace it
          </Text>

          {/* the mini replay board */}
          {deal && (
            <View style={[styles.board, { backgroundColor: gs.card, boxShadow: `0 5px 0 ${gs.cardEdge}` }]}>
              <View style={{ width: boardW, height: ROWS * cell - miniGap }}>
                {deal.tiles.map((t) => (
                  <View
                    key={t.id}
                    style={[
                      styles.miniTile,
                      {
                        left: t.col * cell,
                        top: t.row * cell,
                        width: miniTile,
                        height: miniTile,
                        borderRadius: Math.round(miniTile * 0.2),
                        backgroundColor: gs.mono.bg,
                        boxShadow: `0 2px 0 ${gs.mono.edge}`,
                      },
                    ]}>
                    <Text style={[styles.miniLetter, { color: gs.monoInk, fontSize: miniTile * 0.45 }]}>
                      {t.letter === 'q' ? 'Qu' : t.letter.toUpperCase()}
                    </Text>
                  </View>
                ))}
                {flash && (
                  <DevFlash
                    key={flash.key}
                    cells={flash.cells}
                    size={miniTile}
                    cell={cell}
                    onDone={() => setFlash(null)}
                  />
                )}
              </View>
            </View>
          )}

          {/* the list: ✦ clues green, best word crowned, the rest plain */}
          <View style={styles.list}>
            {words.map((w, i) => {
              const isClue = found.includes(w.word);
              return (
                <Pressable
                  key={w.word}
                  onPress={() => traceWord(w.word)}
                  style={[
                    styles.row,
                    { backgroundColor: theme.card },
                    deadRow === w.word && styles.rowDead,
                  ]}>
                  <Text style={[styles.dot, { color: isClue ? CLUE_GREEN : i === 0 ? ACCENT : theme.faint }]}>
                    {isClue ? '✦' : i === 0 ? '♛' : '·'}
                  </Text>
                  <Text style={[styles.word, { color: theme.ink }]}>{w.word.toUpperCase()}</Text>
                  <Text style={[styles.pts, { color: isClue ? CLUE_GREEN : theme.sub }]}>+{w.pts}</Text>
                </Pressable>
              );
            })}
            {words.length === 0 && (
              <Text style={[styles.empty, { color: theme.sub }]}>
                finish a round and the day's whole hunt lives here
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
    alignItems: 'center',
  },
  sub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: -8,
  },
  board: {
    borderRadius: 16,
    padding: 12,
  },
  miniTile: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLetter: {
    fontFamily: 'Fredoka_600SemiBold',
    includeFontPadding: false,
  },
  list: {
    alignSelf: 'stretch',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  rowDead: {
    opacity: 0.45,
  },
  dot: {
    width: 18,
    textAlign: 'center',
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
  },
  word: {
    flex: 1,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  pts: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 8,
  },
});
