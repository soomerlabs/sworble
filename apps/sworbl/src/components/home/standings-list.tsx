// HOME SUB-LEADERBOARD (owner): ranks 4-10 under the podium. YOU appear
// exactly once — inline at your true rank when you're inside the top 10,
// appended after an ellipsis row when you're outside it, and as a dashed
// ghost row while you haven't played yet.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PALETTE, tileColorFor } from '@/game/palette';
import { type Theme, ACCENT, ACCENT_EDGE } from '@/game/theme';

export interface StandingRow {
  rank: number;
  name: string;
  score: number;
  you: boolean;
}

function Row({ r, theme }: { r: StandingRow; theme: Theme }) {
  const pal = PALETTE[tileColorFor(r.name[0]?.toLowerCase() ?? 'a', 0)];
  const ink = r.you ? '#1F1442' : theme.ink;
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: r.you ? ACCENT : theme.card },
        r.you && { boxShadow: `0 3px 0 ${ACCENT_EDGE}, inset 0 1.5px 0 rgba(255,255,255,0.4)` },
      ]}>
      <Text style={[styles.rank, { color: r.you ? '#1F1442' : theme.faint }]}>{r.rank}</Text>
      <View
        style={[
          styles.block,
          r.you
            ? { backgroundColor: '#F3EFFF', boxShadow: '0 2px 0 #CFC2F2' }
            : { backgroundColor: pal.bg, boxShadow: `inset 0 -2px 0 ${pal.edge}` },
        ]}>
        <Text style={styles.blockLetter}>{r.name[0]}</Text>
      </View>
      <Text style={[styles.name, { color: ink }]}>{r.you ? 'you' : r.name.toLowerCase()}</Text>
      <Text style={[styles.score, { color: ink }]}>{r.score.toLocaleString()}</Text>
    </View>
  );
}

interface Props {
  theme: Theme;
  rows: StandingRow[]; // ranks 4-10 (you inline if you're in them)
  youOutside: StandingRow | null; // set when your rank is past the list
  ghost: boolean; // not played yet → dashed placeholder row
  emptyRows?: number; // sparse field → dashed open seats (the field awaits)
}

export function StandingsList({ theme, rows, youOutside, ghost, emptyRows = 0 }: Props) {
  return (
    <View style={styles.list}>
      {rows.map((r) => (
        <Row key={`${r.rank}-${r.name}`} r={r} theme={theme} />
      ))}
      {Array.from({ length: emptyRows }, (_, i) => (
        <View key={`empty-${i}`} style={[styles.row, styles.emptyRow, { borderColor: theme.dashed }]}>
          <Text style={[styles.rank, { color: theme.faint }]}>{rows.length + 4 + i}</Text>
        </View>
      ))}
      {youOutside && (
        <>
          <Text style={[styles.ellipsis, { color: theme.faint }]}>· · ·</Text>
          <Row r={youOutside} theme={theme} />
        </>
      )}
      {ghost && (
        <View style={[styles.row, styles.ghostRow, { borderColor: theme.dashed }]}>
          <Text style={[styles.rank, { color: theme.faint }]}>?</Text>
          <View style={[styles.block, styles.ghostBlock, { borderColor: theme.dashed }]} />
          <Text style={[styles.name, { color: theme.faint }]}>you</Text>
          <Text style={[styles.score, { color: theme.faint }]}>—</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: 'stretch',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderCurve: 'continuous',
  },
  ghostRow: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  emptyRow: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    minHeight: 40,
  },
  rank: {
    width: 16,
    textAlign: 'center',
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12.5,
  },
  block: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBlock: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  blockLetter: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13,
    color: '#1F1442',
    includeFontPadding: false,
  },
  name: {
    flex: 1,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
  score: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  ellipsis: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 12,
  },
});
