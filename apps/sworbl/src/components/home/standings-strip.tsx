// THE STANDINGS STRIP (owner: "consolidate that up a little") — home's
// glanceable read of the day's board: three podium cells in one card,
// your seat appended only when you're off it. The FULL floating podium
// stays the leaderboard page's celebration surface. The whole card is
// the leaderboard door.
import { router } from 'expo-router';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { PALETTE, tileColorFor } from '@/game/palette';
import { ACCENT, type Theme } from '@/game/theme';

interface Props {
  theme: Theme;
  // the HEALED rows (home's name-match splice) — top three seats
  podium: Array<{ name: string; score: number; you: boolean }>;
  you: { rank: number; score: number } | null; // your seat when OFF the podium
}

export function StandingsStrip({ theme, podium, you }: Props) {
  return (
    <Pressable
      onPress={() => router.push('/leaderboard')}
      style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cells}>
        {Array.from({ length: 3 }, (_, i) => {
          const e = podium[i];
          if (!e) {
            return (
              <View key={i} style={styles.cell}>
                <View style={[styles.block, styles.blockGhost, { borderColor: theme.dashed }]} />
                <View style={styles.cellText}>
                  <Text style={[styles.name, { color: theme.faint }]}>— —</Text>
                </View>
              </View>
            );
          }
          const pal = PALETTE[tileColorFor(e.name[0]?.toLowerCase() ?? 'a', 0)];
          return (
            <View key={i} style={styles.cell}>
              <View style={[styles.block, { backgroundColor: pal.bg, boxShadow: `inset 0 -2.5px 0 ${pal.edge}` }]}>
                <Text style={styles.blockRank}>{i + 1}</Text>
              </View>
              <View style={styles.cellText}>
                <Text
                  style={[styles.name, { color: e.you ? ACCENT : theme.ink }]}
                  numberOfLines={1}>
                  {e.name.toLowerCase()}
                </Text>
                <Text style={[styles.score, { color: theme.sub }]}>
                  {e.score.toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      {you && (
        <View style={[styles.youRow, { borderTopColor: theme.hairline }]}>
          <Text style={[styles.youText, { color: ACCENT }]}>
            you · #{you.rank} · {you.score.toLocaleString()}
          </Text>
          <Text style={[styles.chev, { color: theme.faint }]}>›</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  cells: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  cellText: {
    flexShrink: 1,
    gap: 0,
  },
  block: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // a BLOCK, not a circle (owner) — tile squircle ratio at strip scale
  blockGhost: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 6, borderCurve: 'continuous',
  },
  blockRank: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    color: '#1F1442',
  },
  name: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12.5,
  },
  score: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  youRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  youText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
  },
  chev: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
  },
});
