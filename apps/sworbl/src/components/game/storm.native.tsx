// THE SWORBL GLOW — Apple-grade edge weather (owner: "i just want it to
// look like apple"). The tileblob circus is retired: one luminous hue field
// sweeps slowly along the bottom edge under heavy gaussian blur — the
// Siri-glow idiom in sworbl's six candy hues — with two soft blooms
// drifting through it for depth. Feathered top so it never ends on a hard
// line; strongest at the screen's bottom edge, exactly where the pull
// begins. Parent (home) drives overall opacity/scale for park/arm/travel.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas, Group, Paint, Blur, Rect, Circle, LinearGradient, RadialGradient, vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue, useDerivedValue, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';

// the six candy hues, closed into a loop so the sweep never shows a seam
const HUES = ['#A78BFA', '#5BC8F5', '#5FD6A8', '#F58FB8', '#F5B84A', '#F58A66'];

function useDrift(dur: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    // 0→1→0 mirrored — every driver is a slow sine breath
    t.value = withRepeat(
      withTiming(1, { duration: dur / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur]);
  return t;
}

export default function Storm({ width, height = 260 }: {
  width: number; height?: number; zoom?: number; // zoom kept for API parity
}) {
  const sweep = useDrift(26000); // the hue field slides, glacially
  const breath = useDrift(9000); // the whole glow breathes

  const W = width * 1.7; // wider than the screen — the slide never shows an end
  const sweepX = useDerivedValue(() => [{ translateX: -(W - width) * sweep.value }]);
  const glowOpacity = useDerivedValue(() => 0.8 + breath.value * 0.2);
  const bloomA = useDerivedValue(() => [
    { translateX: width * (0.24 + 0.1 * sweep.value) },
    { translateY: height * (0.66 - 0.1 * breath.value) },
  ]);
  const bloomB = useDerivedValue(() => [
    { translateX: width * (0.74 - 0.12 * sweep.value) },
    { translateY: height * (0.58 + 0.09 * breath.value) },
  ]);

  return (
    <View pointerEvents="none" style={[styles.wrap, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Group layer={<Paint />} opacity={glowOpacity}>
          <Group layer={<Paint><Blur blur={26} /></Paint>}>
            {/* the hue field: one wide band, all six hues, heavy blur */}
            <Group transform={sweepX}>
              <Rect x={0} y={height * 0.34} width={W} height={height}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(W, 0)}
                  colors={[...HUES, HUES[0], HUES[1]]}
                />
              </Rect>
            </Group>
            {/* two soft blooms drifting through the field — the depth cue */}
            <Group transform={bloomA}>
              <Circle cx={0} cy={0} r={height * 0.62}>
                <RadialGradient
                  c={vec(0, 0)}
                  r={height * 0.62}
                  colors={['rgba(167,139,250,0.7)', 'rgba(167,139,250,0)']}
                  positions={[0, 0.85]}
                />
              </Circle>
            </Group>
            <Group transform={bloomB}>
              <Circle cx={0} cy={0} r={height * 0.55}>
                <RadialGradient
                  c={vec(0, 0)}
                  r={height * 0.55}
                  colors={['rgba(245,143,184,0.6)', 'rgba(245,143,184,0)']}
                  positions={[0, 0.85]}
                />
              </Circle>
            </Group>
          </Group>
          {/* vertical feather: nothing at the top, full at the bottom edge —
              the glow BELONGS to the screen's lip, Apple-style */}
          <Rect x={0} y={0} width={width} height={height} blendMode="dstIn">
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height)}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,1)']}
              positions={[0.06, 0.52, 0.94]}
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
