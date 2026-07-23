// Aurora-of-blocks storm — NATIVE (Skia), matched 1:1 to the web spec
// (index.html .storm* CSS + #stormGoo filter). Proven on the Phase-0 spike:
// 6 tileblobs anchored at the bottom edge (half below the fold), exact orbit
// keyframes 15-22s, goo = blur(11)+alpha 30/-14 blended over sharp source,
// all inside blur(12), purple pulsing haze, radial mask from below-bottom-center.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas, Group, Paint, Blur, ColorMatrix, RoundedRect, Rect, Circle,
  LinearGradient, RadialGradient, vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue, useDerivedValue, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { BG_DARK } from '@/game/palette';

interface Blob {
  xPct: number;
  bot: number;
  s: number;
  c: string;
  dur: number;
  f: [number, number, number]; // 0% keyframe: dx, dy, scale
  t: [number, number, number]; // 50% keyframe
}

// verbatim from .stormB1-B6
const BLOBS: Blob[] = [
  { xPct: 1,  bot: -2,  s: 44, c: '#A78BFA', dur: 17000, f: [-4, 5, 0.9],  t: [10, -9, 1.02] },
  { xPct: 19, bot: -12, s: 54, c: '#5BC8F5', dur: 19000, f: [5, 4, 1.02],  t: [-14, -19, 0.93] },
  { xPct: 38, bot: -22, s: 68, c: '#5FD6A8', dur: 15000, f: [-8, 6, 0.94], t: [10, -32, 1.12] },
  { xPct: 55, bot: -20, s: 64, c: '#F58FB8', dur: 21000, f: [8, 5, 1.05],  t: [-10, -29, 0.9] },
  { xPct: 74, bot: -12, s: 54, c: '#F5B84A', dur: 18000, f: [-5, 4, 0.96], t: [15, -18, 1.06] },
  { xPct: 91, bot: -2,  s: 44, c: '#F58A66', dur: 22000, f: [4, 5, 0.9],   t: [-10, -9, 1.02] },
];

// #stormGoo's alpha snap: blur(11) then alpha ×30 -14
const GOO = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 30, -14];

function useOrbit(dur: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    // 0→1→0 mirrors the CSS 0%→50%→100% keyframe loop
    t.value = withRepeat(
      withTiming(1, { duration: dur / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [dur]);
  return t;
}

function DriftBlob({ b, i, width, height, zoom }: {
  b: Blob; i: number; width: number; height: number; zoom: number;
}) {
  const t = useOrbit(b.dur);
  const s = b.s * zoom; // band duty (owner): BIGGER blocks
  const bx = (b.xPct / 100) * width - s / 2 + b.s / 2;
  // CENTERED in the band, gently varied per blob — not floor-stacked
  const by = height / 2 - s / 2 + ((i % 3) - 1) * 10;
  const drift = Math.max(1, zoom * 0.9); // motion reads at band scale
  const transform = useDerivedValue(() => {
    const k = t.value;
    const lerp = (a: number, z: number) => a + (z - a) * k;
    return [
      { translateX: bx + lerp(b.f[0], b.t[0]) * drift },
      { translateY: by + lerp(b.f[1], b.t[1]) * drift },
      { scale: lerp(b.f[2], b.t[2]) },
    ];
  });
  return (
    <Group transform={transform} origin={vec(s / 2, s / 2)}>
      <RoundedRect x={0} y={0} width={s} height={s} r={22 * Math.max(1, zoom * 0.8)} color={b.c} />
    </Group>
  );
}

function BlobField({ width, height, zoom }: { width: number; height: number; zoom: number }) {
  return (
    <>
      {BLOBS.map((b, i) => (
        <DriftBlob key={i} b={b} i={i} width={width} height={height} zoom={zoom} />
      ))}
    </>
  );
}

export default function Storm({ width, height = 260, zoom = 1 }: { width: number; height?: number; zoom?: number }) {
  const hazeT = useOrbit(20000);
  const hazeOpacity = useDerivedValue(() => 0.4 + hazeT.value * 0.22);
  const cx = width / 2;

  return (
    <View pointerEvents="none" style={[styles.wrap, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Group layer={<Paint />}>
          {/* stormHaze: purple radial glow, mid-band, pulsing 0.4↔0.62 */}
          <Group opacity={hazeOpacity}>
            <Circle cx={cx} cy={height / 2} r={width * 0.42}>
              <RadialGradient
                c={vec(cx, height / 2)}
                r={width * 0.42}
                colors={['rgba(167,139,250,0.2)', 'rgba(167,139,250,0)']}
                positions={[0, 0.8]}
              />
            </Circle>
          </Group>

          {/* .stormBlockwrap: the whole goo composite inside blur(12) */}
          <Group layer={<Paint><Blur blur={12} /></Paint>}>
            {/* feBlend: sharp source blobs UNDER the goo'd copy */}
            <BlobField width={width} height={height} zoom={zoom} />
            <Group layer={<Paint><Blur blur={11} /><ColorMatrix matrix={GOO} /></Paint>}>
              <BlobField width={width} height={height} zoom={zoom} />
            </Group>
          </Group>

          {/* SOFT VERTICAL FEATHER (owner: the old bottom-anchored mask cut a
              hard line at the canvas edge) — both edges melt to nothing */}
          <Rect x={0} y={0} width={width} height={height} blendMode="dstIn">
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height)}
              colors={[
                'rgba(0,0,0,0)',
                'rgba(0,0,0,1)',
                'rgba(0,0,0,1)',
                'rgba(0,0,0,0)',
              ]}
              positions={[0, 0.22, 0.78, 1]}
            />
          </Rect>
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    backgroundColor: BG_DARK + '00', // transparent; canvas draws everything
  },
});
