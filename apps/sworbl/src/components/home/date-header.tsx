// DATE HEADER — home's instance of the shared ScreenHeader grammar. When
// the day is complete, the score docks at the title's right edge and IS the
// share button (owner: "right edge, put the score... we need a way to share").
import React from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { type Theme, ACCENT } from '@/game/theme';
import { puzzleNo } from '@/game/share';

interface Props {
  theme: Theme;
  dayKey: string;
  score?: number | null; // completed day → docks right of the title
  streak?: number; // 🔥 in the eyebrow when ≥2
  onShare?: () => void;
  onInfo?: () => void; // pre-play: the ⓘ lives where the score will
}

export function DateHeader({ theme, dayKey, score, streak, onShare, onInfo }: Props) {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const monthDay = now
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    .toLowerCase();
  return (
    <ScreenHeader
      theme={theme}
      eyebrow=""
      // THE MASTHEAD (owner): brand-font "sworb" + italic "of the day" —
      // the daily ritual wears its name; Nº and the flame ride the tail
      eyebrowNode={
        <View style={styles.masthead}>
          <Text style={[styles.mastheadBrand, { color: theme.ink }]}>sworb</Text>
          <Text style={[styles.mastheadItalic, { color: theme.sub }]}>of the day</Text>
          <Text style={[styles.mastheadTail, { color: theme.faint }]}>
            · Nº {puzzleNo(dayKey)}
            {streak && streak >= 2 ? `  🔥 ${streak}` : ''}
          </Text>
        </View>
      }
      title={weekday}
      titleAccent={monthDay}
      right={
        score != null ? (
          <Pressable onPress={onShare} hitSlop={10} style={styles.scoreTap}>
            <Text style={[styles.score, { color: theme.ink }]}>{score.toLocaleString()}</Text>
            <View style={styles.shareRow}>
              <Icon name="share" size={11} color={ACCENT} />
              <Text style={styles.shareText}>share</Text>
            </View>
          </Pressable>
        ) : onInfo ? (
          <Pressable onPress={onInfo} hitSlop={12} style={[styles.infoChip, { backgroundColor: theme.card }]}>
            <Icon name="info" size={14} color={ACCENT} />
          </Pressable>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  masthead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  mastheadBrand: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  mastheadItalic: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13.5,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  mastheadTail: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
  },
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
  shareText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10.5,
    color: ACCENT,
  },
  infoChip: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
