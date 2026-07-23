// DATE HEADER — home's instance of the shared ScreenHeader grammar. When
// the day is complete, the score docks at the title's right edge and IS the
// share button (owner: "right edge, put the score... we need a way to share").
import React from 'react';
import { Text, Pressable, StyleSheet, Platform, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ScreenHeader } from '@/components/screen-header';
import { type Theme, ACCENT } from '@/game/theme';
import { puzzleNo } from '@/game/share';

interface Props {
  theme: Theme;
  dayKey: string;
  score?: number | null; // completed day → docks right of the title
  onShare?: () => void;
}

export function DateHeader({ theme, dayKey, score, onShare }: Props) {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const monthDay = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    .toLowerCase();
  return (
    <ScreenHeader
      theme={theme}
      eyebrow={`DAILY PUZZLE · Nº ${puzzleNo(dayKey)}`}
      title={weekday}
      titleAccent={monthDay}
      right={
        score != null ? (
          <Pressable onPress={onShare} hitSlop={10} style={styles.scoreTap}>
            <Text style={[styles.score, { color: theme.ink }]}>{score.toLocaleString()}</Text>
            <View style={styles.shareRow}>
              {Platform.OS === 'ios' ? (
                <SymbolView name={'square.and.arrow.up' as never} size={11} tintColor={ACCENT} />
              ) : (
                <Text style={styles.shareGlyph}>↗</Text>
              )}
              <Text style={styles.shareText}>share</Text>
            </View>
          </Pressable>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  scoreTap: {
    alignItems: 'flex-end',
    gap: 1,
  },
  score: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  shareGlyph: {
    fontSize: 11,
    color: ACCENT,
  },
  shareText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10.5,
    color: ACCENT,
  },
});
