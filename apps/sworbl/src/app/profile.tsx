// PROFILE (handoff 4a, lifted as-is): avatar block + name + "since", the
// 2×2 stat cards (BEST green · AVG · GAMES · WORDS FOUND), YOUR BEST word
// as candy letter blocks with its pay badge, runner-up word pills, and the
// 9-week PLAY HISTORY heat grid. All device-local stats (stats.ts).
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ScreenBar } from '@/components/screen-bar';
import { useTheme, CLUE_GREEN } from '@/game/theme';
import { PALETTE, tileColorFor } from '@/game/palette';
import { loadStats, historyGrid } from '@/game/stats';
import { getPlayerName } from '@/game/player';

const HEAT_DARK = ['#1b1a22', '#3d3557', '#8a72d6', '#B485FF'];
const HEAT_LIGHT = ['#E2DFEE', '#CFC4EC', '#A98FE8', '#8971FF'];

function sinceLine(firstDay: string | null): string {
  if (!firstDay) return 'new around here';
  const [y, m] = firstDay.split('-').map(Number);
  const mon = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  return `since ${mon} ’${String(y).slice(2)}`;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const stats = useMemo(() => loadStats(), []);
  const name = getPlayerName();
  const avatarPal = PALETTE[tileColorFor(name[0]?.toLowerCase() ?? 'p', 0)];
  const grid = useMemo(() => historyGrid(stats), [stats]);
  const heat = theme.mode === 'dark' ? HEAT_DARK : HEAT_LIGHT;
  const cellS = Math.floor((Math.min(width, 480) - 36 - 8 * 6) / 2 / 4.6); // 9 cols fit

  const cards = [
    { label: 'BEST SCORE', value: stats.best, dot: PALETTE[2], accent: CLUE_GREEN },
    { label: 'AVG SCORE', value: stats.games ? Math.round(stats.total / stats.games) : 0, dot: PALETTE[0] },
    { label: 'GAMES', value: stats.games, dot: PALETTE[1] },
    { label: 'WORDS FOUND', value: stats.words, dot: PALETTE[4] },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safe}>
        <ScreenBar theme={theme} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* identity row */}
          <View style={styles.idRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: avatarPal.bg,
                  boxShadow: `0 6px 0 ${avatarPal.edge}, inset 0 3px 0 rgba(255,255,255,0.42)`,
                },
              ]}>
              <Text style={styles.avatarLetter}>{name[0]}</Text>
            </View>
            <View style={styles.idText}>
              <Text style={[styles.name, { color: theme.ink }]}>{name}</Text>
              <Text style={[styles.since, { color: theme.sub }]}>{sinceLine(stats.firstDay)}</Text>
            </View>
          </View>

          {/* 2×2 stat cards */}
          <View style={styles.cards}>
            {cards.map((c) => (
              <View key={c.label} style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHead}>
                  <View
                    style={[
                      styles.cardDot,
                      { backgroundColor: c.dot.bg, boxShadow: `0 1.5px 0 ${c.dot.edge}` },
                    ]}
                  />
                  <Text style={[styles.cardLabel, { color: theme.faint }]}>{c.label}</Text>
                </View>
                <Text style={[styles.cardValue, { color: c.accent ?? theme.ink }]}>
                  {c.value.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* YOUR BEST — the lifetime word in candy blocks + its pay */}
          <View style={styles.section}>
            <View style={styles.bestHead}>
              <Text style={[styles.sectionLabel, { color: theme.faint }]}>YOUR BEST</Text>
              {stats.bestWord && (
                <View style={[styles.payBadge, { backgroundColor: theme.card, borderColor: theme.hairline }]}>
                  <Text style={styles.payPts}>+{stats.bestWord.pts}</Text>
                </View>
              )}
            </View>
            {stats.bestWord ? (
              <View style={styles.bestRow}>
                {[...stats.bestWord.word].map((ch, i) => {
                  const pal = PALETTE[tileColorFor(ch, i)];
                  return (
                    <View
                      key={i}
                      style={[
                        styles.bestBlock,
                        {
                          backgroundColor: pal.bg,
                          boxShadow: `0 2px 0 ${pal.edge}, inset 0 1px 0 rgba(255,255,255,0.35)`,
                        },
                      ]}>
                      <Text style={styles.bestLetter}>{ch.toUpperCase()}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.emptyLine, { color: theme.sub }]}>
                your best word will live here
              </Text>
            )}
            {stats.topWords.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pillRow}>
                  {stats.topWords.slice(1).map((w) => (
                    <View key={w.word} style={[styles.wordPill, { backgroundColor: theme.card }]}>
                      <Text style={[styles.pillWord, { color: theme.ink }]}>
                        {w.word.toUpperCase()}
                      </Text>
                      <Text style={styles.pillPts}>+{w.pts}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* 9-week heat grid */}
          <View style={styles.section}>
            <View style={styles.historyHead}>
              <Text style={[styles.sectionLabel, { color: theme.faint }]}>PLAY HISTORY</Text>
              <Text style={[styles.historySub, { color: theme.faint }]}>LAST 9 WEEKS</Text>
            </View>
            <View style={styles.grid}>
              {Array.from({ length: 9 }, (_, w) => (
                <View key={w} style={styles.gridCol}>
                  {Array.from({ length: 7 }, (_, d) => (
                    <View
                      key={d}
                      style={[
                        styles.gridCell,
                        { width: cellS, height: cellS, backgroundColor: heat[grid[w * 7 + d] ?? 0] },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
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
    paddingTop: 16,
    paddingBottom: 28,
    gap: 20,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 28,
    color: '#1F1442',
    includeFontPadding: false,
  },
  idText: {
    gap: 3,
  },
  name: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
  },
  since: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11.5,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    gap: 7,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDot: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  cardLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 8.5,
    letterSpacing: 1.3,
  },
  cardValue: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 26,
    fontVariant: ['tabular-nums'],
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 8.5,
    letterSpacing: 1.3,
  },
  bestHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  payPts: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: CLUE_GREEN,
  },
  bestRow: {
    flexDirection: 'row',
    gap: 4,
  },
  bestBlock: {
    width: 25,
    height: 25,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestLetter: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: '#1F1442',
    includeFontPadding: false,
  },
  emptyLine: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 1,
  },
  wordPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  pillWord: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
  },
  pillPts: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10,
    color: CLUE_GREEN,
  },
  historyHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historySub: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 9,
  },
  grid: {
    flexDirection: 'row',
    gap: 6,
  },
  gridCol: {
    gap: 6,
  },
  gridCell: {
    borderRadius: 5,
  },
});
