// FLOATING STEPPED PODIUM + YOU-BLOCK (handoff shared component, 20a/6a/6b):
// three candy blocks at stepped heights — #1 center highest (60px, crown +
// gold aura + drifting confetti), #2 right mid (margin-top 18), #3 left low
// (margin-top 34). No riser blocks: rank reads from height. Each block
// FLOATS on its own loop (web podFloatA/B/C keyframes, ported exactly).
// Below: the indigo you-block with a #rank badge — or "play to join" when
// there's no personal score yet.
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { Crown as CrownSvg } from '@/components/crown';
import { PALETTE, tileColorFor } from '@/game/palette';
import { type Theme, ACCENT, ACCENT_EDGE } from '@/game/theme';
import { type LbEntry } from '@/game/standings';

const EASE = Easing.inOut(Easing.sin);

// module-level worklet — helpers must NEVER be defined inside the animated
// style closures: the React Compiler hoists them into plain JS functions and
// the UI runtime then calls a remote function (the boot crash)
function lerp(a: number, b: number, f: number): number {
  'worklet';
  return a + (b - a) * f;
}

// web podFloatA: gentle orbit with counter-rotation (3s)
function useFloatA() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(650, withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1));
  }, []);
  return useAnimatedStyle(() => {
    const p = t.value;
    // web amplitudes ×1.6 (owner: the float was too subtle to see) —
    // 0/25/50/75/100% → (0,0,0) (-5.5,-3,-3°) (0,-6.5,0) (5.5,-3,3°) (0,0,0)
    const seg = p * 4;
    let x = 0, y = 0, r = 0;
    if (seg < 1) { x = lerp(0, -5.5, seg); y = lerp(0, -3, seg); r = lerp(0, -3, seg); }
    else if (seg < 2) { x = lerp(-5.5, 0, seg - 1); y = lerp(-3, -6.5, seg - 1); r = lerp(-3, 0, seg - 1); }
    else if (seg < 3) { x = lerp(0, 5.5, seg - 2); y = lerp(-6.5, -3, seg - 2); r = lerp(0, 3, seg - 2); }
    else { x = lerp(5.5, 0, seg - 3); y = lerp(-3, 0, seg - 3); r = lerp(3, 0, seg - 3); }
    return { transform: [{ translateX: x }, { translateY: y }, { rotate: `${r}deg` }] };
  });
}

// web podFloatB: bouncy vertical hover (3.4s) — #1 and the you-block
function useFloatB() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(350, withRepeat(
      withSequence(
        // web amplitudes ×1.5 (owner: more pronounced, not overwhelming)
        withTiming(-15, { duration: 1428, easing: EASE }), // 42%
        withTiming(-8, { duration: 544, easing: EASE }), // 58%
        withTiming(-12, { duration: 544, easing: EASE }), // 74%
        withTiming(0, { duration: 884, easing: EASE })
      ),
      -1
    ));
  }, []);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
}

// web podFloatC: lazy tilt-sway (3.9s)
function useFloatC() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(900, withRepeat(
      withSequence(
        withTiming(1, { duration: 1170, easing: EASE }), // 30%
        withTiming(2, { duration: 1248, easing: EASE }), // 62%
        withTiming(3, { duration: 1482, easing: EASE })
      ),
      -1
    ));
  }, []);
  return useAnimatedStyle(() => {
    const p = t.value;
    // web amplitudes ×1.6 (owner: more pronounced, not overwhelming)
    let r = 0, y = 0;
    if (p < 1) { r = lerp(0, 5.5, p); y = lerp(0, -3, p); }
    else if (p < 2) { r = lerp(5.5, -5.5, p - 1); y = lerp(-3, -5, p - 1); }
    else { r = lerp(-5.5, 0, p - 2); y = lerp(-5, 0, p - 2); }
    return { transform: [{ rotate: `${r}deg` }, { translateY: y }] };
  });
}

function Crown() {
  return <CrownSvg width={22} fill="#F5B84A" edge="#CE9022" style={styles.crown} />;
}

// web auraPulse: the champion's gold radial glow, breathing
function Aura() {
  const s = useSharedValue(0.9);
  useEffect(() => {
    s.value = withDelay(500, withRepeat(withTiming(1.12, { duration: 1500, easing: EASE }), -1, true));
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.aura, st]} />;
}

// web confFadeA/B: bits spawn above the champion and drift down, looping
const CONF = [
  { left: 6, color: '#F5B84A', w: 5, h: 8, dur: 4800, delay: 300, dx: -9 },
  { left: 22, color: '#F58FB8', w: 5, h: 9, dur: 5400, delay: 1500, dx: 10 },
  { left: 38, color: '#5BC8F5', w: 4, h: 7, dur: 5000, delay: 2400, dx: -9 },
  { left: 52, color: '#F5B84A', w: 5, h: 8, dur: 5200, delay: 900, dx: 10 },
  { left: 66, color: '#5FD6A8', w: 4, h: 7, dur: 5600, delay: 3100, dx: -9 },
  { left: 78, color: '#A78BFA', w: 5, h: 9, dur: 4700, delay: 2000, dx: 10 },
  { left: 14, color: '#F5B84A', w: 5, h: 8, dur: 5300, delay: 1100, dx: -9 },
  { left: 60, color: '#F58A66', w: 4, h: 7, dur: 5100, delay: 3600, dx: 10 },
] as const;

function ConfettiBit({ c }: { c: (typeof CONF)[number] }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      c.delay,
      withRepeat(withTiming(1, { duration: c.dur, easing: Easing.linear }), -1)
    );
  }, []);
  const st = useAnimatedStyle(() => {
    const p = t.value;
    return {
      transform: [
        { translateX: p * c.dx },
        { translateY: -8 + p * 92 },
        { rotate: `${(c.dx < 0 ? -12 + p * 332 : 10 - p * 310)}deg` },
      ],
      opacity: p < 0.14 ? p / 0.14 : p < 0.55 ? 1 : Math.max(0, 0.9 * (1 - (p - 0.55) / 0.45)),
    };
  });
  return (
    <Animated.View
      style={[
        st,
        {
          position: 'absolute', left: c.left, top: 0,
          width: c.w, height: c.h, borderRadius: 2, backgroundColor: c.color,
        },
      ]}
    />
  );
}

function blockPal(name: string) {
  return PALETTE[tileColorFor(name[0]?.toLowerCase() ?? 'a', 0)];
}

interface ColProps {
  theme: Theme;
  entry: LbEntry;
  place: 1 | 2 | 3;
}

function PodCol({ theme, entry, place }: ColProps) {
  const floatA = useFloatA();
  const floatB = useFloatB();
  const floatC = useFloatC();
  const first = place === 1;
  const size = first ? 60 : 50;
  const pal = blockPal(entry.name);
  const float = first ? floatB : place === 3 ? floatA : floatC;
  return (
    <View style={[styles.col, { width: first ? 80 : 70, marginTop: first ? 0 : place === 2 ? 18 : 34 }]}>
      <Animated.View style={float}>
        {first && <Aura />}
        {first && (
          <View pointerEvents="none" style={styles.confWrap}>
            {CONF.map((c, i) => (
              <ConfettiBit key={i} c={c} />
            ))}
          </View>
        )}
        {first && <Crown />}
        <View
          style={[
            styles.block,
            {
              width: size, height: size,
              backgroundColor: pal.bg,
              boxShadow: `inset 0 ${first ? -7 : -6}px 0 ${pal.edge}, ${theme.blockShadow}`,
            },
          ]}>
          <Text style={[styles.blockLetter, { fontSize: first ? 27 : 23 }]}>
            {entry.name[0]}
          </Text>
          <View
            style={[
              styles.placeBadge,
              { backgroundColor: theme.mode === 'dark' ? '#EDEFF7' : '#1F1442' },
            ]}>
            <Text
              style={[
                styles.placeText,
                { color: theme.mode === 'dark' ? '#1F1442' : '#FFFFFF' },
              ]}>
              {place}
            </Text>
          </View>
        </View>
      </Animated.View>
      <Text style={[styles.name, { color: theme.sub }]}>{entry.name}</Text>
      <Text style={[styles.score, { color: theme.ink, fontSize: first ? 13 : 12 }]}>
        {entry.score.toLocaleString()}
      </Text>
    </View>
  );
}

// unplayed: the SPOT where you'd float — a dashed ghost of the you-block
// (owner: replaced the "play to join" text; the empty seat says it better)
function GhostYou({ theme }: { theme: Theme }) {
  const float = useFloatB();
  return (
    <View style={styles.youWrap}>
      <Animated.View style={float}>
        <View style={[styles.block, styles.youBlock, styles.ghostYou, { borderColor: theme.dashed }]}>
          <Text style={[styles.blockLetter, { fontSize: 23, color: theme.dashed }]}>?</Text>
        </View>
      </Animated.View>
      <Text style={[styles.youLabel, { color: theme.faint }]}>YOU</Text>
    </View>
  );
}

function YouBlock({ theme, score, rank }: { theme: Theme; score: number; rank: number }) {
  const float = useFloatB();
  return (
    <View style={styles.youWrap}>
      <Animated.View style={float}>
        <View
          style={[
            styles.block, styles.youBlock,
            { boxShadow: `inset 0 -5px 0 ${ACCENT_EDGE}, 0 6px 14px rgba(137,113,255,0.32)` },
          ]}>
          <Text style={[styles.blockLetter, { fontSize: 23, color: '#FFFFFF' }]}>Y</Text>
          <View
            style={[
              styles.rankBadge,
              { backgroundColor: theme.mode === 'dark' ? '#EDEFF7' : '#1F1442' },
            ]}>
            <Text
              style={[
                styles.rankText,
                { color: theme.mode === 'dark' ? '#1F1442' : '#FFFFFF' },
              ]}>
              #{rank}
            </Text>
          </View>
        </View>
      </Animated.View>
      <Text style={styles.youLabel}>YOU</Text>
      <Text style={[styles.youScore, { color: theme.ink }]}>{score.toLocaleString()}</Text>
    </View>
  );
}

interface Props {
  theme: Theme;
  entries: LbEntry[]; // sorted desc
  you: { score: number; rank: number } | null; // null → "play to join"
  showTitle?: boolean; // leaderboard renders its own big title
  showFoot?: boolean; // leaderboard pins YOU in the LIST, not under the podium
}

// a MISSING podium step: dashed '?' block, FLAT (fossil rule: only real
// players float — ghosts hold the step and wait)
function GhostCol({ theme, place }: { theme: Theme; place: 2 | 3 }) {
  return (
    <View style={[styles.col, { width: 70, marginTop: place === 2 ? 18 : 34 }]}>
      <View
        style={[
          styles.block,
          styles.ghostBlock,
          { width: 50, height: 50, borderColor: theme.dashed },
        ]}>
        <Text style={[styles.blockLetter, { fontSize: 23, color: theme.dashed }]}>?</Text>
      </View>
      <Text style={[styles.name, { color: theme.faint }]}>—</Text>
      <Text style={[styles.score, { color: theme.faint, fontSize: 12 }]}>· · ·</Text>
    </View>
  );
}

export function FloatingPodium({ theme, entries, you, showTitle = true, showFoot = true }: Props) {
  const [first, second, third] = entries;
  if (!first) return null;
  return (
    <View style={styles.wrap}>
      {showTitle && <Text style={[styles.title, { color: theme.sub }]}>standings</Text>}
      <View style={styles.row}>
        {third ? (
          <PodCol key="p3" theme={theme} entry={third} place={3} />
        ) : (
          <GhostCol key="g3" theme={theme} place={3} />
        )}
        <PodCol key="p1" theme={theme} entry={first} place={1} />
        {second ? (
          <PodCol key="p2" theme={theme} entry={second} place={2} />
        ) : (
          <GhostCol key="g2" theme={theme} place={2} />
        )}
      </View>
      {showFoot &&
        (you ? (
          <YouBlock theme={theme} score={you.score} rank={you.rank} />
        ) : (
          <GhostYou theme={theme} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 16,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 16,
    // the crown (-16) and confetti (-10) live ABOVE the champion's block —
    // this padding is THEIR room (owner twice: "crammed")
    paddingTop: 26,
    paddingBottom: 2,
  },
  col: {
    alignItems: 'center',
  },
  block: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockLetter: {
    fontFamily: 'Fredoka_600SemiBold',
    color: '#1F1442',
    includeFontPadding: false,
  },
  crown: {
    position: 'absolute',
    top: -16,
    alignSelf: 'center',
    zIndex: 2,
  },
  // owner: "WAY too much hue radiating" — a whisper of gold, not a sunrise
  aura: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 999,
    left: '50%',
    top: '50%',
    marginLeft: -48,
    marginTop: -48,
    backgroundColor: 'rgba(245,184,74,0.07)',
    boxShadow: '0 0 22px 10px rgba(245,184,74,0.08)',
  },
  confWrap: {
    position: 'absolute',
    width: 88,
    height: 96,
    left: '50%',
    marginLeft: -44,
    top: -10,
  },
  name: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 9,
  },
  score: {
    fontFamily: 'Fredoka_600SemiBold',
  },
  youWrap: {
    alignItems: 'center',
    gap: 3,
    paddingTop: 16,
  },
  youBlock: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: ACCENT,
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10,
  },
  youLabel: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
    color: ACCENT,
    marginTop: 5,
  },
  ghostYou: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  ghostBlock: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  placeBadge: {
    position: 'absolute',
    top: -7,
    left: -9,
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeText: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 10,
    includeFontPadding: false,
  },
  youScore: {
    fontFamily: 'Fredoka_600SemiBold',
    fontSize: 15,
  },
});
