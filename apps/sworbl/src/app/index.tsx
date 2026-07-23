// HOME — the v18 design ported: word-light, storm-anchored. Date + score up
// top, the hero word (candy when the day is done — the answer is NEVER gray on
// home), the ghost clue fan, superlatives, and the countdown dock over the
// storm (brewing before play, resting after). Swipe up or tap PLAY → /play.
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Animated, { ZoomIn } from 'react-native-reanimated';

import Storm from '@/components/game/storm';
import { ClueFan } from '@/components/game/clue-fan';
import { Floaters } from '@/components/home/floaters';
import { CountdownDock } from '@/components/home/countdown-dock';
import { Superlatives } from '@/components/home/superlatives';
import { BG_DARK, PALETTE, INK, tileColorFor } from '@/game/palette';
import { dealDaily } from '@/game/daily';
import { loadDay, type DayState } from '@/game/persist';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const deal = useMemo(() => dealDaily(), []);

  // re-read day state every time home regains focus (returning from /play)
  const [day, setDay] = React.useState<DayState | null>(null);
  useFocusEffect(
    React.useCallback(() => {
      if (deal) setDay(loadDay(deal.dayKey));
    }, [deal])
  );

  const played = day?.route === 'consumed';
  const solved = played && !!day?.sworb?.solved;
  const toPlay = () => router.push('/play');

  // swipe up anywhere → play (the v18 gesture; PLAY button is the visible affordance)
  const swipeUp = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(24)
        .onEnd((e) => {
          'worklet';
          if (e.translationY < -60 && Math.abs(e.translationX) < 80) runOnJS(toPlay)();
        }),
    []
  );

  const dateLine = new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();

  const bs = deal ? Math.min(52, Math.floor(280 / deal.sworb.length)) : 48;

  return (
    <GestureDetector gesture={swipeUp}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <Floaters width={width} height={height} />
        <View style={played ? styles.stormRest : undefined}>
          <Storm width={width} height={Math.min(280, height * 0.32)} />
        </View>

        <SafeAreaView style={styles.safe}>
          {/* date + score, spanning the screen (v18 top strip) */}
          <View style={styles.top}>
            {__DEV__ && (
              <Pressable onPress={() => router.push('/dev')} style={styles.gear} hitSlop={10}>
                <Text style={styles.gearText}>⚙</Text>
              </Pressable>
            )}
            <Text style={styles.date}>{dateLine}</Text>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>{played ? 'TODAY' : 'SWORBL OF THE DAY'}</Text>
              <Text style={[styles.score, !played && styles.scoreGhost]}>
                {played ? (day?.score ?? 0).toLocaleString() : '0'}
              </Text>
            </View>
          </View>

          <View style={styles.middle}>
            {/* hero word: candy when done (always candy — owner rule); hidden before */}
            {played && deal ? (
              <View style={styles.heroRow}>
                {[...deal.sworb].map((ch, i) => {
                  const pal = PALETTE[tileColorFor(ch, i)];
                  return (
                    <Animated.View
                      key={i}
                      entering={ZoomIn.delay(80 + i * 70).springify().mass(0.6)}
                      style={[
                        styles.heroBlock,
                        {
                          width: bs, height: bs * 1.14, borderRadius: Math.round(bs * 0.25),
                          backgroundColor: pal.bg, boxShadow: `0 3px 0 ${pal.edge}`,
                        },
                      ]}>
                      <Text style={[styles.heroText, { fontSize: Math.round(bs * 0.52) }]}>
                        {ch.toUpperCase()}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.heroRow}>
                {Array.from({ length: deal?.sworb.length ?? 5 }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.heroBlock, styles.heroGhost,
                      { width: bs, height: bs * 1.14, borderRadius: Math.round(bs * 0.25) },
                    ]}
                  />
                ))}
              </View>
            )}
            {played && !solved && <Text style={styles.missLine}>not cracked — tomorrow's another sworbl</Text>}

            {/* the 6 clue spots — ghosts before play, candy after (found only) */}
            {deal && <ClueFan clues={deal.clues} found={day?.found ?? []} />}

            <View style={styles.supWrap}>
              <Superlatives words={day?.bestWords ?? []} />
            </View>

            {!played && (
              <Pressable onPress={toPlay} style={styles.playBtn}>
                <Text style={styles.playText}>PLAY TODAY</Text>
              </Pressable>
            )}
            {played && (
              <Pressable onPress={toPlay} style={styles.resultLink}>
                <Text style={styles.resultLinkText}>see result ›</Text>
              </Pressable>
            )}
          </View>

          <CountdownDock played={played} />
        </SafeAreaView>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  stormRest: {
    opacity: 0.4, // v18 resting storm after the day is played
  },
  safe: {
    flex: 1,
  },
  top: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  date: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 11.5,
    letterSpacing: 1.4,
    color: '#5A5A66',
  },
  gear: {
    position: 'absolute',
    right: 18,
    top: 10,
    zIndex: 5,
  },
  gearText: {
    fontSize: 18,
    color: '#5A5A66',
  },
  scoreCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: 'rgba(137,113,255,0.12)',
    borderRadius: 18,
    paddingVertical: 14,
    gap: 2,
  },
  scoreLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: '#9DA2B3',
  },
  score: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 42,
    lineHeight: 46,
    color: '#8971FF',
    fontVariant: ['tabular-nums'],
  },
  scoreGhost: {
    color: '#33333E',
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 16,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 6,
  },
  heroBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGhost: {
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: '#2E2E38',
  },
  heroText: {
    fontFamily: 'Fredoka_600SemiBold',
    color: INK,
    includeFontPadding: false,
  },
  missLine: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 12.5,
    color: '#9DA2B3',
  },
  supWrap: {
    marginTop: 4,
  },
  playBtn: {
    backgroundColor: '#8971FF',
    borderRadius: 14,
    paddingHorizontal: 26,
    paddingVertical: 12,
    boxShadow: '0 4px 0 #5A43C9',
  },
  playText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  resultLink: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  resultLinkText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 13.5,
    color: '#8971FF',
  },
});
