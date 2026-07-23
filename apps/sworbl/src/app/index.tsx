// The play screen — the ONE game's full arc:
//   count-in (3·2·1·GO) → live round (7:00 hunt) → finale (6 guesses) → reveal.
// Phase 2 increment 2. Persistence/one-shot-per-day lands with the MMKV seam.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { GameBoard } from '@/components/game/game-board';
import { CountIn } from '@/components/game/count-in';
import { Finale } from '@/components/game/finale';
import { ResultView } from '@/components/game/result-view';
import Storm from '@/components/game/storm';
import { BG_DARK } from '@/game/palette';
import { dealDaily } from '@/game/daily';
import { CLUE_COUNT } from '@/game/types';
import { loadDay, saveProgress, finishDay } from '@/game/persist';

const ROUND_SECS = 420; // "the Seven" — dev knob arrives with the settings screen

type Phase = 'countin' | 'live' | 'finale' | 'done';

export default function PlayScreen() {
  const { width, height } = useWindowDimensions();

  // deal info for the finale/result (the board deals identically off the same day)
  const deal = useMemo(() => dealDaily(), []);
  // boot routing via the engine: consumed day → straight to the reveal, one shot per day
  const boot = useMemo(() => (deal ? loadDay(deal.dayKey) : null), [deal]);
  const consumed = !!boot && boot.route === 'consumed';

  const [phase, setPhase] = useState<Phase>(consumed ? 'done' : 'countin');
  const [countInMounted, setCountInMounted] = useState(!consumed);
  const [score, setScore] = useState(consumed ? boot!.score : 0);
  const [found, setFound] = useState<string[]>(consumed ? boot!.found : []);
  const [remaining, setRemaining] = useState(ROUND_SECS);
  const [result, setResult] = useState<{ solved: boolean; guessesUsed: number; bonus: number } | null>(
    // defensive: a consumed day with no sworb state (interrupted write) still lands
    // on a coherent reveal rather than a blank screen
    consumed ? (boot!.sworb ?? { solved: false, guessesUsed: 0, bonus: 0 }) : null
  );
  const endAtRef = useRef<number>(0);

  // live progress persists on every change (sync writes; consumed days never re-save)
  useEffect(() => {
    if (deal && !consumed && phase !== 'done') saveProgress(deal.dayKey, score, found);
  }, [deal, consumed, phase, score, found]);

  // clock: anchored at GO, ticks while live, 0:00 → finale
  useEffect(() => {
    if (phase !== 'live') return;
    const h = setInterval(() => {
      const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setPhase('finale');
    }, 250);
    return () => clearInterval(h);
  }, [phase]);

  const onRelease = useCallback(() => {
    endAtRef.current = Date.now() + ROUND_SECS * 1000;
    setRemaining(ROUND_SECS);
    setPhase('live');
  }, []);

  const onFinaleDone = useCallback(
    (r: { solved: boolean; guessesUsed: number; bonus: number }) => {
      setResult(r);
      const finalScore = score + (r.bonus > 0 ? r.bonus : 0);
      if (r.bonus > 0) setScore(finalScore);
      // the day ends exactly once: result written, then the DONE lock
      if (deal) {
        finishDay(deal.dayKey, finalScore, found, {
          guessesUsed: r.guessesUsed,
          solved: r.solved,
          bonus: r.bonus,
        });
      }
      setPhase('done');
    },
    [deal, score, found]
  );

  const tile = Math.min(64, Math.floor((Math.min(width, 480) - 32) / (5 + 4 * 0.16)));
  const gap = Math.round(tile * 0.16);
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Storm width={width} height={Math.min(280, height * 0.32)} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Text style={styles.brand}>sworbl</Text>
          {(phase === 'live' || phase === 'countin') && (
            // dev shortcut: long-press the clock → straight to the finale
            <Pressable onLongPress={() => setPhase('finale')} delayLongPress={600}>
              <Text style={[styles.clock, remaining <= 60 && styles.clockLow]}>{clock}</Text>
            </Pressable>
          )}
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        <View style={styles.center}>
          {(phase === 'countin' || phase === 'live') && (
            <View pointerEvents={phase === 'live' ? 'auto' : 'none'}>
              <GameBoard size={tile} gap={gap} onScore={setScore} onClues={setFound} />
              {countInMounted && phase === 'countin' && (
                <CountIn onRelease={onRelease} onUnmount={() => setCountInMounted(false)} />
              )}
            </View>
          )}
          {phase === 'finale' && deal && (
            <Finale
              entry={{ sworb: deal.sworb }}
              foundCount={found.length}
              clueTotal={CLUE_COUNT}
              size={tile}
              onDone={onFinaleDone}
            />
          )}
          {phase === 'done' && deal && result && (
            <ResultView
              word={deal.sworb}
              definition={deal.definition}
              solved={result.solved}
              guessesUsed={result.guessesUsed}
              score={score}
              bonus={result.bonus}
            />
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
  clock: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 24,
    color: '#EDEFF7',
    fontVariant: ['tabular-nums'],
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
});
