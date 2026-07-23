// THE PARKED FROST — WEB: a pure COLOR dissolve, no backdrop-filter.
// Chrome's backdrop-filter + mask combination leaks seam artifacts at the
// filter-region boundary (owner saw the line twice, including after nav
// recomposits — the 4%-floor workaround didn't hold). A gradient of the
// surface color has NO filter region and therefore NO seam, ever; the
// aurora beneath supplies the atmosphere. Web is preview-grade — the real
// progressive blur lives in the NATIVE SIBLING: park-frost.tsx.
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
  const c = mode === 'dark' ? '16,16,20' : '237,239,247';
  const dissolve: React.CSSProperties = {
    ...fill,
    background: `linear-gradient(to bottom, rgba(${c},0), rgba(${c},0.38) 45%, rgba(${c},0.66) 100%)`,
  };
  return <div style={dissolve} />;
}
