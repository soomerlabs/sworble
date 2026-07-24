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
  eyebrowNode?: React.ReactNode; // custom eyebrow (home's masthead) — wins over the string
  title: string;
  titleAccent?: string; // optional second segment in indigo
  titleAdornment?: React.ReactNode; // small tail after the title (e.g. edit pencil)
  right?: React.ReactNode;
}

export function ScreenHeader({ theme, eyebrow, eyebrowNode, title, titleAccent, titleAdornment, right }: Props) {
  return (
    <View style={styles.wrap}>
      {eyebrowNode ?? <Text style={[styles.eyebrow, { color: theme.faint }]}>{eyebrow}</Text>}
      <View style={styles.line}>
        <View style={styles.titleRow}>
          <Text style={[styles.big, { color: theme.ink }]}>{title}</Text>
          {!!titleAccent && <Text style={[styles.big, { color: ACCENT }]}>{titleAccent}</Text>}
          {titleAdornment}
        </View>
      </View>
      <View style={[styles.hairline, { backgroundColor: theme.hairline }]} />
      {/* the right slot floats ABSOLUTE — its content can NEVER move the
          hairline (owner: headers must be IDENTICAL across screens) */}
      {right && <View style={styles.right}>{right}</View>}
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
    minHeight: 36, // the ONE line height — every screen's hairline lands
    // at exactly eyebrow + 36 + 11, no exceptions
    justifyContent: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    flexShrink: 1,
    flexWrap: 'wrap',
    paddingRight: 96, // clears the floating right slot
  },
  big: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 31,
    lineHeight: 36,
  },
  right: {
    position: 'absolute',
    right: 0,
    bottom: 15, // rides just above the hairline, outside the flow
    alignItems: 'flex-end',
  },
  hairline: {
    height: 1.5,
    marginTop: 11,
    alignSelf: 'stretch',
  },
});
