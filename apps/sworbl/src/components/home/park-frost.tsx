// THE PARKED FROST — NATIVE: progressive gradient-masked blur (owner: no
// visible top edge, content gradually blurs). Two layers: a light haze
// ramping in from the band's top, the full frost ramping in beneath —
// sharp → haze → frost with no boundary. RNCMaskedView's native half is
// verified in the Podfile.lock (the silent-swallow trap is closed).
// WEB SIBLING: park-frost.web.tsx does the same with CSS backdrop-filter +
// mask-image — patch both or state why not.
import React from 'react';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

export function ParkFrost({ mode }: { mode: 'light' | 'dark' }) {
  // ULTRA-THIN material, not the plain dark tint (owner: "hard black line"
  // at the screen's bottom) — plain 'dark' paints a near-black wash that
  // buried the aurora exactly where the frost mask peaks; the thin material
  // BLURS without painting, so the glow stays lit under the dissolve
  const tint = mode === 'dark' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';
  return (
    <>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', '#000']}
            locations={[0, 0.38, 0.75]}
            style={StyleSheet.absoluteFill}
          />
        }>
        <BlurView intensity={15} tint={tint} style={StyleSheet.absoluteFill} />
      </MaskedView>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={['transparent', 'transparent', '#000']}
            locations={[0, 0.42, 0.82]}
            style={StyleSheet.absoluteFill}
          />
        }>
        <BlurView intensity={28} tint={tint} style={StyleSheet.absoluteFill} />
      </MaskedView>
    </>
  );
}
