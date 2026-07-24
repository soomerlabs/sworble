// HOME's STANDINGS section — head (title + the ONE tappable chart button,
// owner: "just that button haha"), the floating podium, and the list /
// empty-field line, wrapped in the data-arrival fade. Extracted from home
// (the index god-file split); pure display.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@/components/icon';

import { Arrive } from '@/components/arrive';
import { FloatingPodium } from '@/components/home/floating-podium';
import { StandingsList, type StandingRow } from '@/components/home/standings-list';
import { type LbEntry } from '@/game/standings';
import { type Theme } from '@/game/theme';

interface Props {
  theme: Theme;
  entries: LbEntry[];
  standings: { podium: LbEntry[]; list: StandingRow[]; youOutside: StandingRow | null };
  hasYou: boolean; // you (or your remote row) present in the field
  devCount: boolean; // gold diagnostics: show field size in the title
}

export function StandingsSection({ theme, entries, standings, hasYou, devCount }: Props) {
  return (
    <View style={styles.standingsWrap}>
      <View style={styles.standingsHead}>
        {/* title gone (owner: "get rid of the standings title") — the
            podium IS the label; the chart button keeps the door visible */}
        <View />
        {__DEV__ && devCount && (
          <Text style={[styles.standingsTitle, { color: theme.sub }]}>
            {entries.length} in field
          </Text>
        )}
        <Pressable
          onPress={() => router.push('/leaderboard')}
          hitSlop={10}
          style={[styles.chartBtn, { backgroundColor: theme.card }]}>
          <Icon name="chart" size={16} color="#8971FF" />
        </Pressable>
      </View>
      <Arrive ready={entries.length > 0} style={styles.arriveWrap}>
        {/* the field itself is a door too (owner) — any row opens the
            full leaderboard; the chart button stays for discoverability */}
        <Pressable onPress={() => router.push('/leaderboard')}>
        <FloatingPodium
          theme={theme}
          entries={standings.podium}
          you={null}
          showTitle={false}
          showFoot={false}
        />
        {standings.podium.length === 0 ? (
          // TRULY EMPTY field: ghost podium + three dashed open seats
          // (owner brought the rows back — the caption stays gone)
          <StandingsList theme={theme} rows={[]} youOutside={null} ghost={false} emptyRows={3} />
        ) : (
          // PODIUM ONLY (owner: "get rid of the 4 5 6") — below the podium
          // lives exactly one line: YOUR seat, and only when you're not
          // already standing on it
          <StandingsList
            theme={theme}
            rows={[]}
            youOutside={standings.youOutside}
            ghost={!hasYou}
            emptyRows={0}
          />
        )}
        </Pressable>
      </Arrive>
    </View>
  );
}

const styles = StyleSheet.create({
  standingsWrap: {
    alignSelf: 'stretch',
    gap: 12,
  },
  arriveWrap: {
    alignSelf: 'stretch',
    gap: 12, // same rhythm as standingsWrap — the wrapper is invisible
  },
  standingsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  standingsTitle: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
  },
  chartBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldAwait: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
