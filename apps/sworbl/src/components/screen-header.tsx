// THE SCREEN HEADER — one grammar everywhere (owner): tiny eyebrow, big
// two-tone title, hairline. Home's date header, leaderboard, profile,
// settings, and dev all speak it, so screen transitions read as the same
// surface changing its words. `right` docks content at the title's right
// edge (home: the day's score + share).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type Theme, ACCENT } from '@/game/theme';

interface Props {
  theme: Theme;
  eyebrow: string;
  title: string;
  titleAccent?: string; // optional second segment in indigo
  right?: React.ReactNode;
}

export function ScreenHeader({ theme, eyebrow, title, titleAccent, right }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.eyebrow, { color: theme.faint }]}>{eyebrow}</Text>
      <View style={styles.line}>
        <View style={styles.titleRow}>
          <Text style={[styles.big, { color: theme.ink }]}>{title}</Text>
          {!!titleAccent && <Text style={[styles.big, { color: ACCENT }]}>{titleAccent}</Text>}
        </View>
        {right && <View style={styles.right}>{right}</View>}
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  big: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 31,
    lineHeight: 36,
  },
  right: {
    alignItems: 'flex-end',
    paddingBottom: 2,
  },
  hairline: {
    height: 1.5,
    marginTop: 11,
    alignSelf: 'stretch',
  },
});
