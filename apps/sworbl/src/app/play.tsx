// The play screen — the ONE game's full arc with persistence:
//   count-in → live hunt (pause/auto-pause, snapshot on every change) →
//   finale (snapshot per guess) → reveal (day locked, one shot).
// Boot routes through the engine (consumed → resume → finale → fresh).
// Clock model: accumulated boardElapsedMs (engine.run.remainingSecs derives the
// display) — resume RE-ARMS the count-in, never jumps to a running clock.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppState, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import engine from '@sworbl/engine';

import { GameBoard } from '@/components/game/game-board';
import { CountIn } from '@/components/game/count-in';
import { Finale, type FinaleRestore } from '@/components/game/finale';
import { ResultView } from '@/components/game/result-view';
import { PauseCover } from '@/components/game/pause-cover';
import Storm from '@/components/game/storm';
import { BG_DARK } from '@/game/palette';
import { dealDaily, bumpNextId } from '@/game/daily';
import { CLUE_COUNT, type TileT } from '@/game/types';
import { loadDay, saveProgress, finishDay, saveRun, type RunSnap, type BestWord } from '@/game/persist';
import { TUNING } from '@/game/tuning';
import { router } from 'expo-router';
import Animated, { ZoomIn, FadeOut } from 'react-native-reanimated';

// TIME FUEL: three minutes given, the Seven if you earn it (engine.run.timeForWord)

type Phase = 'countin' | 'live' | 'paused' | 'finale' | 'done';

export default function PlayScreen() {
  const { width, height } = useWindowDimensions();

  const deal = useMemo(() => dealDaily(), []);
  const boot = useMemo(() => (deal ? loadDay(deal.dayKey) : null), [deal]);
  const route = boot?.route ?? 'fresh';

  // a resumed run re-enters through the pause cover; a killed finale re-enters the finale
  const [phase, setPhase] = useState<Phase>(
    route === 'consumed' ? 'done' : route === 'resume' ? 'paused' : route === 'finale' ? 'finale' : 'countin'
  );
  const [countInMounted, setCountInMounted] = useState(route === 'fresh');
  const bootedFromKill = useRef(route === 'resume');
  const [score, setScore] = useState(boot?.run ? boot.run.score : route === 'consumed' ? boot!.score : 0);
  const [found, setFound] = useState<string[]>(boot?.run ? boot.run.found : boot ? boot.found : []);
  const [result, setResult] = useState<{ solved: boolean; guessesUsed: number; bonus: number } | null>(
    route === 'consumed' ? (boot!.sworb ?? { solved: false, guessesUsed: 0, bonus: 0 }) : null
  );
  const finaleRestore = useRef<FinaleRestore | undefined>(
    boot?.run && boot.run.phase === 'finale'
      ? { rows: boot.run.rows, slots: boot.run.slots, colors: boot.run.colors, guessesUsed: boot.run.guessesUsed }
      : undefined
  );

  // restored board state (resume route) — injected into GameBoard once
  const initialTiles = useMemo<TileT[] | undefined>(() => {
    if (!boot?.run || boot.run.phase !== 'live') return undefined;
    if (deal) deal.setQueueIdx(boot.run.queueIdx); // the SAME letter stream continues
    // restored ids must never collide with the fresh process's tile counter
    bumpNextId(Math.max(...boot.run.tiles.map((t) => t.id)));
    return boot.run.tiles.map((t) => ({ ...t, spawnDrop: 0, bornAt: Date.now() }));
  }, [boot, deal]);

  // ---- clock: accumulated elapsed ms vs base + EARNED time (the fuel bank) ----
  const elapsedBaseRef = useRef(boot?.run ? boot.run.boardElapsedMs : 0);
  const earnedMsRef = useRef(boot?.run ? boot.run.earnedMs : 0);
  const liveStartRef = useRef(0);
  const elapsedNow = () =>
    elapsedBaseRef.current + (liveStartRef.current ? Date.now() - liveStartRef.current : 0);
  const effSecs = () => TUNING.BASE_SECS + earnedMsRef.current / 1000;
  const [remaining, setRemaining] = useState(() =>
    engine.run.remainingSecs(effSecs(), elapsedBaseRef.current)
  );
  const [timePop, setTimePop] = useState<{ key: number; secs: number } | null>(null);
  const popKeyRef = useRef(0);

  useEffect(() => {
    if (phase !== 'live') return;
    const h = setInterval(() => {
      const left = engine.run.remainingSecs(effSecs(), elapsedNow());
      setRemaining(left);
      if (left <= 0) {
        liveStartRef.current = 0;
        setPhase('finale');
      }
    }, 250);
    return () => clearInterval(h);
  }, [phase]);

  // ---- run snapshots ----
  const boardTilesRef = useRef<TileT[]>(initialTiles ?? deal?.tiles ?? []);
  const queueIdxRef = useRef(boot?.run?.queueIdx ?? 0);
  const snapLive = useCallback(() => {
    if (!deal) return;
    const snap: RunSnap = {
      client: 'rn', v: 1, day: deal.dayKey, phase: 'live',
      tiles: boardTilesRef.current.map(({ id, letter, col, row, ci }) => ({ id, letter, col, row, ci })),
      queueIdx: queueIdxRef.current,
      score, found, boardElapsedMs: elapsedNow(), earnedMs: earnedMsRef.current,
      guessesUsed: 0, rows: [], slots: [], colors: [],
    };
    saveRun(snap);
  }, [deal, score, found]);

  const onTiles = useCallback((tiles: TileT[], queueIdx: number) => {
    boardTilesRef.current = tiles;
    queueIdxRef.current = queueIdx;
  }, []);

  // every spelled word: superlatives feed + the TIME-FUEL grant (engine-decided,
  // cap-clipped so base + earned never exceeds the Seven)
  const wordsRef = useRef<BestWord[]>([]);
  const onWordSpelled = useCallback((word: string, pts: number, caughtClue: boolean) => {
    wordsRef.current.push({ word, pts });
    const grant = engine.run.timeForWord({
      len: word.length,
      isClue: caughtClue,
      earnedMs: earnedMsRef.current,
      baseSecs: TUNING.BASE_SECS,
      capSecs: TUNING.CAP_SECS,
    });
    if (grant > 0) {
      earnedMsRef.current += grant;
      setRemaining(engine.run.remainingSecs(effSecs(), elapsedNow()));
      setTimePop({ key: ++popKeyRef.current, secs: Math.round(grant / 1000) });
      setTimeout(() => setTimePop((p) => (p && p.key === popKeyRef.current ? null : p)), 1000);
    }
  }, []);

  // persist progress + live snapshot on every meaningful change
  useEffect(() => {
    if (!deal || phase === 'done') return;
    saveProgress(deal.dayKey, score, found);
    if (phase === 'live') snapLive();
  }, [deal, phase, score, found]);

  const onFinaleProgress = useCallback(
    (s: FinaleRestore) => {
      if (!deal) return;
      finaleRestore.current = s;
      const snap: RunSnap = {
        client: 'rn', v: 1, day: deal.dayKey, phase: 'finale',
        tiles: boardTilesRef.current.map(({ id, letter, col, row, ci }) => ({ id, letter, col, row, ci })),
        queueIdx: queueIdxRef.current,
        score, found, boardElapsedMs: effSecs() * 1000, earnedMs: earnedMsRef.current,
        guessesUsed: s.guessesUsed, rows: s.rows, slots: s.slots, colors: s.colors,
      };
      saveRun(snap);
    },
    [deal, score, found]
  );

  // entering the finale marks the snapshot phase (a kill during guessing re-enters here)
  useEffect(() => {
    if (phase === 'finale' && deal) {
      onFinaleProgress(
        finaleRestore.current ?? { rows: [], slots: [], colors: [], guessesUsed: 0 }
      );
    }
  }, [phase]);

  // ---- pause / resume (engine rule: resume re-arms the count-in) ----
  const pause = useCallback(() => {
    if (phase !== 'live') return;
    elapsedBaseRef.current = elapsedNow();
    liveStartRef.current = 0;
    snapLive();
    setPhase('paused');
  }, [phase, snapLive]);

  const resumeTap = useCallback(() => {
    bootedFromKill.current = false;
    setCountInMounted(true);
    setPhase('countin');
  }, []);

  const onRelease = useCallback(() => {
    liveStartRef.current = Date.now();
    setRemaining(engine.run.remainingSecs(effSecs(), elapsedBaseRef.current));
    setPhase('live');
  }, []);

  // auto-pause: backgrounding mid-hunt pauses and snapshots (fairness + safety)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') pause();
    });
    return () => sub.remove();
  }, [pause]);

  const onFinaleDone = useCallback(
    (r: { solved: boolean; guessesUsed: number; bonus: number }) => {
      setResult(r);
      const finalScore = score + (r.bonus > 0 ? r.bonus : 0);
      if (r.bonus > 0) setScore(finalScore);
      // the day ends exactly once: result written, then the DONE lock (clears the run)
      if (deal) {
        finishDay(
          deal.dayKey,
          finalScore,
          found,
          { guessesUsed: r.guessesUsed, solved: r.solved, bonus: r.bonus },
          wordsRef.current
        );
      }
      setPhase('done');
    },
    [deal, score, found]
  );

  const tile = Math.min(64, Math.floor((Math.min(width, 480) - 32) / (5 + 4 * 0.16)));
  const gap = Math.round(tile * 0.16);
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const onBoard = phase === 'countin' || phase === 'live' || phase === 'paused';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Storm width={width} height={Math.min(280, height * 0.32)} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Text style={styles.brand}>sworbl</Text>
          {onBoard && (
            // tap = pause · dev shortcut: long-press → straight to the finale
            <Pressable onPress={pause} onLongPress={() => setPhase('finale')} delayLongPress={600}>
              <View style={styles.clockWrap}>
                <Text style={[styles.clock, remaining <= 30 && styles.clockLow]}>{clock}</Text>
                {timePop && (
                  <Animated.Text
                    key={timePop.key}
                    entering={ZoomIn.springify().mass(0.5)}
                    exiting={FadeOut.duration(200)}
                    style={styles.timePop}>
                    +0:{String(timePop.secs).padStart(2, '0')}
                  </Animated.Text>
                )}
              </View>
            </Pressable>
          )}
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        <View style={styles.center}>
          {onBoard && deal && (
            <View pointerEvents={phase === 'live' ? 'auto' : 'none'}>
              <GameBoard
                deal={deal}
                size={tile}
                gap={gap}
                initialTiles={initialTiles}
                initialFound={boot?.run?.found}
                initialScore={boot?.run?.score}
                secsLeft={phase === 'live' ? remaining : undefined}
                mercySecs={TUNING.MERCY_SECS}
                onScore={setScore}
                onClues={setFound}
                onTiles={onTiles}
                onWordSpelled={onWordSpelled}
              />
              {countInMounted && phase === 'countin' && (
                <CountIn onRelease={onRelease} onUnmount={() => setCountInMounted(false)} />
              )}
              {phase === 'paused' && (
                <PauseCover clock={clock} fresh={bootedFromKill.current} onResume={resumeTap} />
              )}
            </View>
          )}
          {phase === 'finale' && deal && (
            <Finale
              entry={{ sworb: deal.sworb }}
              foundCount={found.length}
              clueTotal={CLUE_COUNT}
              size={tile}
              restore={finaleRestore.current}
              onProgress={onFinaleProgress}
              onDone={onFinaleDone}
            />
          )}
          {phase === 'done' && deal && result && (
            <View style={styles.doneWrap}>
              <ResultView
                word={deal.sworb}
                definition={deal.definition}
                solved={result.solved}
                guessesUsed={result.guessesUsed}
                score={score}
                bonus={result.bonus}
              />
              <Pressable onPress={() => router.replace('/')} style={styles.homeLink}>
                <Text style={styles.homeLinkText}>home ›</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  safe: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  brand: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: '#A78BFA',
  },
  clockWrap: {
    alignItems: 'center',
  },
  clock: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: '#EDEFF7',
    fontVariant: ['tabular-nums'],
  },
  timePop: {
    position: 'absolute',
    top: 26,
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 14,
    color: '#5FD6A8',
  },
  clockLow: {
    color: '#FF8A8E',
  },
  score: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: '#EDEFF7',
    fontVariant: ['tabular-nums'],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneWrap: {
    alignItems: 'center',
    gap: 18,
  },
  homeLink: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  homeLinkText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
    color: '#8971FF',
  },
});
