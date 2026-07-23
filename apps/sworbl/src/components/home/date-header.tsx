// DATE HEADER (handoff 20a/6b): tiny "DAILY PUZZLE · Nº N" eyebrow, then the
// big weekday + accent month-day line, then a hairline. Leads the screen —
// the par bar is gone (owner-approved handoff call).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type Theme, ACCENT } from '@/game/theme';
import { TUNING } from '@/game/tuning';

// puzzle number: days since the launch epoch, 1-based
function puzzleNo(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  const [ey, em, ed] = TUNING.PUZZLE_EPOCH.split('-').map(Number);
  const days = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(ey, em - 1, ed)) / 86400000
  );
  return Math.max(1, days + 1);
}

export function DateHeader({ theme, dayKey }: { theme: Theme; dayKey: string }) {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const monthDay = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    .toLowerCase();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.eyebrow, { color: theme.faint }]}>
        DAILY PUZZLE · Nº {puzzleNo(dayKey)}
      </Text>
      <View style={styles.line}>
        <Text style={[styles.big, { color: theme.ink }]}>{weekday}</Text>
        <Text style={[styles.big, { color: ACCENT }]}>{monthDay}</Text>
      </View>
      <View style={[styles.hairline, { backgroundColor: theme.hairline }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    gap: 4,
  },
  eyebrow: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10,
    letterSpacing: 2.5,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    flexWrap: 'wrap',
  },
  big: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 31,
    lineHeight: 36,
  },
  hairline: {
    height: 1.5,
    marginTop: 11,
    alignSelf: 'stretch',
  },
});
