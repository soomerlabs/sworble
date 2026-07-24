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
import { type LbEntry } from '@/game/standings';

interface Props {
  theme: Theme;
  entries: LbEntry[]; // ranked field (remote or stub)
  you: { rank: number; score: number } | null; // your seat when known
  youOnPodium: boolean;
}

export function StandingsStrip({ theme, entries, you, youOnPodium }: Props) {
  const podium = entries.slice(0, 3);
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
                  <Text style={[styles.name, { color: theme.faint }]}>open</Text>
                  <Text style={[styles.score, { color: theme.faint }]}>—</Text>
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
                  style={[styles.name, { color: e.isMe ? ACCENT : theme.ink }]}
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
      {you && !youOnPodium && (
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
  blockGhost: {
    borderWidth: 2,
    borderStyle: 'dashed',
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
