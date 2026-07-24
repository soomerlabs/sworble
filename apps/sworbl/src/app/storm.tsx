// STORM BOARD — the seed-run screen (modes-spec "ghost duels" groundwork).
// A pure practice round on a shared deterministic board: same seed = same
// board for everyone, which is the whole premise of per-seed leaderboards,
// featured seeds, and (soon) ghost races. No sworb, no clues, no day state —
// spell for 3 minutes, the score rides the practice outbox (keep-best per
// seed, server-validated with delta 0).
import { router, useLocalSearchParams } from 'expo-router';
import { AppState, Share } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GameBoard } from '@/components/game/game-board';
import { dealPractice } from '@/game/daily';
import { haptic } from '@/game/haptics';
import { type BestWord } from '@/game/persist';
import {
  mkClock, clockStart, clockPause, clockRemaining, clockGrant, type ClockState,
} from '@/game/round-clock';
import { gameSurface } from '@/game/palette';
import { useTheme, ACCENT, ACCENT_EDGE } from '@/game/theme';
import { TUNING } from '@/game/tuning';
import { enqueuePractice, fetchPractice } from '@/net/standings-remote';

type Phase = 'ready' | 'countin' | 'live' | 'done';

const SEED_RE = /^[a-z0-9-]{3,24}$/;

function fmtClock(secs: number): string {
  const s = Math.max(0, Math.ceil(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function StormScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ seed?: string }>();
  const rawSeed = typeof params.seed === 'string' ? params.seed : '';
  const seed = SEED_RE.test(rawSeed) ? rawSeed : null;

  // dealNonce lets RUN IT AGAIN rebuild the SAME board fresh (deterministic
  // deal — replays are legal, the server keeps the best)
  const [dealNonce, setDealNonce] = useState(0);
  const deal = useMemo(() => (seed ? dealPractice(seed) : null), [seed, dealNonce]);

  const [phase, setPhase] = useState<Phase>('ready');
  const [board, setBoard] = useState<Array<{ name: string; score: number; isMe: boolean }> | null>(null);
  const [countStep, setCountStep] = useState<'3' | '2' | '1' | null>(null);
  const [score, setScore] = useState(0);
  const wordsRef = useRef<BestWord[]>([]);

  const CT = { baseSecs: TUNING.BASE_SECS, capSecs: TUNING.CAP_SECS };
  const clockRef = useRef<ClockState>(mkClock());
  const [remaining, setRemaining] = useState(CT.baseSecs);

  // ---- count-in: the stepper speaks 3·2·1 (play-sheet's grammar).
  // Timers are TRACKED (leave mid-count → cleared) and entry is guarded
  // (double-tap can't stack two timelines / restart the clock).
  const countTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => countTimers.current.forEach(clearTimeout), []);
  const startRun = () => {
    if (phaseRef.current !== 'ready') return;
    phaseRef.current = 'countin';
    setPhase('countin');
    setCountStep('3');
    const steps: Array<'2' | '1'> = ['2', '1'];
    steps.forEach((st, i) => countTimers.current.push(setTimeout(() => setCountStep(st), 700 * (i + 1))));
    countTimers.current.push(
      setTimeout(() => {
        setCountStep(null);
        clockRef.current = clockStart(mkClock(), Date.now());
        phaseRef.current = 'live';
        setPhase('live');
      }, 700 * 3)
    );
  };
  const phaseRef = useRef<Phase>('ready');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // BACKGROUND FAIRNESS (audit): the clock derives from wall-time — without
  // this, backgrounding bled the whole absence off the round. Same contract
  // as the daily: time only passes while you can see the board.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (phaseRef.current !== 'live') return;
      if (st === 'active') clockRef.current = clockStart(clockRef.current, Date.now());
      else clockRef.current = clockPause(clockRef.current, Date.now());
    });
    return () => sub.remove();
  }, []);

  // cold deep links have no history — done/back must always land somewhere
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // ---- the tick loop: pure clock module decides, this screen renders ----
  useEffect(() => {
    if (phase !== 'live') return;
    let settle: ReturnType<typeof setTimeout> | null = null;
    const h = setInterval(() => {
      const left = clockRemaining(clockRef.current, Date.now(), CT);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(h);
        clockRef.current = clockPause(clockRef.current, Date.now());
        // let 0:00 land for a beat, then the run banks
        settle = setTimeout(() => setPhase('done'), 800);
      }
    }, 250);
    return () => {
      clearInterval(h);
      if (settle) clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---- banked exactly once per finished run ----
  const submittedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'done' || submittedRef.current || !seed) return;
    submittedRef.current = true;
    haptic.soft();
    enqueuePractice(seed, score, wordsRef.current);
    // give the outbox a beat to land, then pull the per-seed standings
    const t = setTimeout(() => {
      void fetchPractice(seed, 5).then((rows) => rows && setBoard(rows));
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // every spelled word: superlative record + the TIME-FUEL grant (engine-
  // decided, cap-clipped) — the same economy as a daily round. useCallback:
  // the memoized board must not re-render on storm's 1Hz clock ticks.
  const onWordSpelled = useCallback((word: string, pts: number, caughtClue: boolean) => {
    wordsRef.current.push({ word, pts });
    const { clock } = clockGrant(clockRef.current, { len: word.length, isClue: caughtClue }, CT);
    clockRef.current = clock;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAgain = () => {
    submittedRef.current = false;
    wordsRef.current = [];
    setBoard(null);
    setScore(0);
    setRemaining(CT.baseSecs);
    clockRef.current = mkClock();
    setDealNonce((n) => n + 1);
    setPhase('ready');
  };

  // board sizing: play-sheet's exact formula
  const { width: winW } = useWindowDimensions();
  const tile = Math.min(64, Math.floor((Math.min(winW, 480) - 32) / (5 + 4 * 0.16)));
  const gap = Math.round(tile * 0.16);

  if (!seed) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <Text style={[styles.title, { color: theme.ink }]}>bad seed</Text>
        <Text style={[styles.sub, { color: theme.sub }]}>
          storm links look like /storm?seed=first-storm
        </Text>
        <Pressable onPress={leave} style={[styles.cta, styles.ctaCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.ctaText, { color: theme.ink }]}>back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* top bar: seed identity + the clock + live score */}
      <View style={styles.topBar}>
        <Pressable onPress={leave} hitSlop={12}>
          <Text style={[styles.backGlyph, { color: theme.icon }]}>‹</Text>
        </Pressable>
        <View style={styles.topMid}>
          <Text style={[styles.eyebrow, { color: theme.faint }]}>STORM BOARD</Text>
          <Text style={[styles.seedName, { color: theme.ink }]}>{seed}</Text>
        </View>
        <View style={styles.topRight}>
          <Text
            style={[
              styles.clock,
              { color: phase === 'live' && remaining <= 30 ? gameSurface(theme.mode).timerLow : theme.ink },
            ]}>
            {fmtClock(phase === 'live' ? remaining : phase === 'done' ? 0 : CT.baseSecs)}
          </Text>
          <Text style={[styles.scoreLine, { color: theme.sub }]}>{score} pts</Text>
        </View>
      </View>

      <View style={styles.boardWrap}>
        {deal && phase !== 'ready' && phase !== 'done' && (
          <GameBoard
            key={`${seed}-${dealNonce}`}
            deal={deal}
            size={tile}
            gap={gap}
            secsLeft={phase === 'live' ? remaining : undefined}
            onScore={setScore}
            onWordSpelled={onWordSpelled}
            concealed={phase !== 'live'}
            countIn={phase === 'countin' ? countStep : null}
          />
        )}

        {phase === 'ready' && (
          <View style={styles.cover}>
            <Text style={[styles.eyebrow, { color: theme.faint }]}>SHARED BOARD</Text>
            <Text style={[styles.title, { color: theme.ink }]}>{seed}</Text>
            <Text style={[styles.sub, { color: theme.sub }]}>
              everyone gets this exact board.{'\n'}3 minutes — best run counts.
            </Text>
            <Pressable onPress={startRun} style={[styles.cta, { backgroundColor: ACCENT, boxShadow: `0 4px 0 ${ACCENT_EDGE}` }]}>
              <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>RUN IT</Text>
            </Pressable>
          </View>
        )}

        {phase === 'done' && (
          <View style={styles.cover}>
            <Text style={[styles.eyebrow, { color: theme.faint }]}>RUN BANKED</Text>
            <Text style={[styles.bigScore, { color: theme.ink }]}>{score}</Text>
            <Text style={[styles.sub, { color: theme.sub }]}>
              {wordsRef.current.length} words · score sent — best run counts
            </Text>
            {board != null && board.length === 0 && (
              <Text style={[styles.sub, { color: theme.faint }]}>first run on this board ✦</Text>
            )}
            {board != null && board.length > 0 && (
              <View style={styles.lbBox}>
                {board.map((r, i) => (
                  <View key={`${r.name}-${i}`} style={styles.lbRow}>
                    <Text style={[styles.lbRank, { color: theme.faint }]}>{i + 1}</Text>
                    <Text
                      style={[styles.lbName, { color: r.isMe ? ACCENT : theme.ink }]}
                      numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={[styles.lbScore, { color: theme.sub }]}>{r.score}</Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable onPress={runAgain} style={[styles.cta, { backgroundColor: ACCENT, boxShadow: `0 4px 0 ${ACCENT_EDGE}` }]}>
              <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>RUN IT AGAIN</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Share.share({
                  message: `sworbl storm ⛈ ${seed} — ${score} pts in 3:00. same board, every player. beat my run: sworbl://storm?seed=${seed}`,
                }).catch(() => {})
              }
              style={[styles.cta, styles.ctaCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.ctaText, { color: theme.ink }]}>share this board</Text>
            </Pressable>
            <Pressable onPress={leave} style={styles.homeLink}>
              <Text style={[styles.ctaText, { color: theme.sub }]}>done ›</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backGlyph: { fontFamily: 'Fredoka_600SemiBold', fontSize: 30, marginTop: -4 },
  topMid: { flex: 1, alignItems: 'center' },
  topRight: { alignItems: 'flex-end', minWidth: 64 },
  eyebrow: { fontFamily: 'Fredoka_600SemiBold', fontSize: 11, letterSpacing: 1.2 },
  seedName: { fontFamily: 'Fredoka_600SemiBold', fontSize: 17 },
  clock: { fontFamily: 'Fredoka_600SemiBold', fontSize: 19, fontVariant: ['tabular-nums'] },
  scoreLine: { fontFamily: 'Fredoka_600SemiBold', fontSize: 12 },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cover: { alignItems: 'center', gap: 14, paddingHorizontal: 32 },
  title: { fontFamily: 'Fredoka_600SemiBold', fontSize: 26 },
  bigScore: { fontFamily: 'Fredoka_600SemiBold', fontSize: 54 },
  sub: { fontFamily: 'Fredoka_600SemiBold', fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  ctaCard: {},
  homeLink: { paddingVertical: 6 },
  cta: {
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 28,
    paddingVertical: 13,
    minWidth: 180,
    alignItems: 'center',
  },
  ctaText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 15, letterSpacing: 0.8 },
  lbBox: { alignSelf: 'stretch', gap: 6, paddingHorizontal: 8 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lbRank: { fontFamily: 'Fredoka_600SemiBold', fontSize: 12, width: 16, textAlign: 'right' },
  lbName: { fontFamily: 'Fredoka_600SemiBold', fontSize: 14, flex: 1 },
  lbScore: { fontFamily: 'Fredoka_600SemiBold', fontSize: 14, fontVariant: ['tabular-nums'] },
});
