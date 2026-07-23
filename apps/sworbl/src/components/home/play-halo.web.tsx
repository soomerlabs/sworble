// PLAY HALO — WEB: CSS conic-gradient disc, blurred and slowly spinning,
// directly behind the P·L·A·Y row (exact geometry from TracePlay). A raw
// <div> guarantees the styles land. NATIVE SIBLING: play-halo.tsx.
import React from 'react';

export const HALO_PAD = 40;

export function PlayHalo({ rowW, rowH }: { rowW: number; rowH: number }) {
  const W = rowW + HALO_PAD * 2;
  const H = rowH + HALO_PAD * 2;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: -HALO_PAD,
    top: -HALO_PAD,
    width: W,
    height: H,
    pointerEvents: 'none',
    borderRadius: '50%',
    background:
      'conic-gradient(from 0deg, #A78BFA, #5BC8F5, #5FD6A8, #F58FB8, #F5B84A, #F58A66, #A78BFA)',
    filter: 'blur(18px)',
    opacity: 0.6,
    animation: 'sworblHaloSpin 36s linear infinite',
  };
  return (
    <>
      <style>{'@keyframes sworblHaloSpin { to { transform: rotate(360deg); } }'}</style>
      <div style={style} />
    </>
  );
}
