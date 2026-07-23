// THE PARKED FROST — WEB: the same progressive dissolve as the native
// masked blurs, in the browser's own language: CSS backdrop-filter masked
// by a vertical gradient. A raw <div> guarantees the styles reach the DOM
// (RNW's style whitelist can't drop them). NATIVE SIBLING: park-frost.tsx.
import React from 'react';

const fill: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
};

export function ParkFrost({ mode }: { mode: 'light' | 'dark' }) {
  const tint = mode === 'dark' ? 'rgba(16,16,20,0.18)' : 'rgba(237,239,247,0.2)';
  // Chrome quirk: where a mask hits PURE zero alpha it truncates the
  // backdrop-filter region — the blur switches on as a hard line at the
  // first non-zero stop (owner saw it after a nav round-trip recomposited
  // the layer). A 4% floor keeps the filter region continuous; 4% of a
  // 6px blur is imperceptible.
  const hazeMask =
    'linear-gradient(to bottom, rgba(0,0,0,0.04), rgba(0,0,0,0.7) 38%, #000 75%)';
  const frostMask =
    'linear-gradient(to bottom, rgba(0,0,0,0.04), rgba(0,0,0,0.12) 42%, #000 82%)';
  const haze: React.CSSProperties = {
    ...fill,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    maskImage: hazeMask,
    WebkitMaskImage: hazeMask,
  };
  const frost: React.CSSProperties = {
    ...fill,
    backgroundColor: tint,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    maskImage: frostMask,
    WebkitMaskImage: frostMask,
  };
  return (
    <>
      <div style={haze} />
      <div style={frost} />
    </>
  );
}
