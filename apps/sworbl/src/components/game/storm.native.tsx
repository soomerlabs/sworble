// THE SWORBL ECLIPSE v6 — NATIVE (Skia). Owner reference: "ring — a
// spinning conic halo of the full palette... eclipse style" (Storm Riff 1e,
// scaled up to be the band's whole weather).
//   · CORONA: a SweepGradient ring of the six hues, heavily blurred,
//     rotating glacially — light bending around the dark body
//   · BODY: the dark disc sits at the PLAY row's altitude — the door IS
//     the eclipse; the tiles rest on it
//   · FLARE: one soft off-axis bloom orbiting slower (the reference's
//     asymmetric corona)
//   · BLOCKS: three sharp candy tiles adrift in the light (brand pulse)
// Feathered top AND bottom (home mounts the canvas taller than the band —
// the bottom melt hangs off-screen at park). The GOO-BLOB aurora this
// replaces lives in git history (v4/v5) if the eclipse loses the bake-off.
// WEB SIBLING: storm.tsx is a simpler CSS port — patch both or say why not.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas, Group, Paint, Blur, Rect, RoundedRect, Circle,
  LinearGradient, RadialGradient, SweepGradient, vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue, useDerivedValue, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';

const HUES = ['#A78BFA', '#5BC8F5', '#5FD6A8', '#F58FB8', '#F5B84A', '#F58A66'];

// our blocks, adrift in the light: x/y (pct of canvas), size, hue, period
const DRIFT_BLOCKS = [
  { x: 0.16, y: 0.56, s: 15, c: 5, dur: 15000, rise: 10 },
  { x: 0.52, y: 0.44, s: 19, c: 0, dur: 19000, rise: 14 },
  { x: 0.82, y: 0.6, s: 13, c: 2, dur: 17000, rise: 9 },
] as const;

// 0→1→0 mirrored sine breath
function useDrift(dur: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: dur / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur]);
  return t;
}

// 0→1 looping linear — continuous rotation
function useSpin(dur: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur]);
  return t;
}

function DriftBlock({ b, width, height }: { b: (typeof DRIFT_BLOCKS)[number]; width: number; height: number }) {
  const t = useDrift(b.dur);
  const transform = useDerivedValue(() => [
    { translateX: width * b.x + t.value * 6 },
    { translateY: height * b.y - t.value * b.rise },
    { rotate: (t.value - 0.5) * 0.14 },
  ]);
  const opacity = useDerivedValue(() => 0.35 + t.value * 0.25);
  return (
    <Group transform={transform} origin={vec(b.s / 2, b.s / 2)} opacity={opacity}>
      <RoundedRect x={0} y={0} width={b.s} height={b.s} r={b.s * 0.3} color={HUES[b.c]} />
    </Group>
  );
}

export default function Storm({ width, height = 260 }: {
  width: number; height?: number; zoom?: number; // zoom kept for API parity
}) {
  const spin = useSpin(42000); // the corona turns, glacially
  const flareSpin = useSpin(67000); // the off-axis bloom orbits slower
  const breath = useDrift(9000); // the whole eclipse breathes

  // the eclipse centers on the PLAY row's altitude in the visible band
  // (canvas is 3 band-heights; the band occupies ~0.47..0.8 of it)
  const cx = width / 2;
  const cy = height * 0.64;
  const CORONA_R = height * 0.34; // the halo's reach
  const BODY_R = height * 0.23; // the dark body under the tiles

  const glowOpacity = useDerivedValue(() => 0.8 + breath.value * 0.2);
  const coronaSpin = useDerivedValue(() => [{ rotate: spin.value * Math.PI * 2 }]);
  const flareT = useDerivedValue(() => [
    { translateX: cx + Math.cos(flareSpin.value * Math.PI * 2) * CORONA_R * 0.75 },
    { translateY: cy + Math.sin(flareSpin.value * Math.PI * 2) * CORONA_R * 0.55 },
  ]);

  return (
    <View pointerEvents="none" style={[styles.wrap, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Group layer={<Paint />} opacity={glowOpacity}>
          {/* THE CORONA: the full palette wrapped around the body, blurred
              and slowly turning — light bending around the eclipse */}
          <Group layer={<Paint><Blur blur={22} /></Paint>}>
            <Group transform={coronaSpin} origin={vec(cx, cy)}>
              <Circle cx={cx} cy={cy} r={CORONA_R}>
                <SweepGradient c={vec(cx, cy)} colors={[...HUES, HUES[0]]} />
              </Circle>
            </Group>
            {/* THE FLARE: a soft bloom orbiting off-axis */}
            <Group transform={flareT}>
              <Circle cx={0} cy={0} r={CORONA_R * 0.7}>
                <RadialGradient
                  c={vec(0, 0)}
                  r={CORONA_R * 0.7}
                  colors={['rgba(245,184,74,0.5)', 'rgba(245,143,184,0.18)', 'rgba(0,0,0,0)']}
                  positions={[0, 0.5, 0.95]}
                />
              </Circle>
            </Group>
          </Group>
          {/* THE BODY: the dark disc the tiles rest on — soft-edged so it
              melts into the corona, never a hard rim */}
          <Group layer={<Paint><Blur blur={5} /></Paint>}>
            <Circle cx={cx} cy={cy} r={BODY_R} color="#0D0D12" />
          </Group>
          {/* OUR BLOCKS: sharp candy tiles adrift in the light */}
          {DRIFT_BLOCKS.map((b, i) => (
            <DriftBlock key={i} b={b} width={width} height={height} />
          ))}
          {/* feather BOTH edges — the head melts into home, the tail melts
              into the board (mounted past the screen at park) */}
          <Rect x={0} y={0} width={width} height={height} blendMode="dstIn">
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height)}
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,0.45)',
                'rgba(0,0,0,1)',
                'rgba(0,0,0,1)',
                'rgba(0,0,0,0)',
              ]}
              positions={[0.02, 0.3, 0.5, 0.86, 0.99]}
            />
          </Rect>
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
