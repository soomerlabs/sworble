// The tier-2 worklet tracer, tested headless — the spike's harness carried
// forward (audit weakness #1: these existed for the spike and were dropped).
// Worklet functions are plain functions under node; shared values are faked
// as plain { value } boxes, exactly the shape the worklet contract reads.
import assert from 'assert';
import { beginW, moveW, type TraceCtx } from '../src/game/trace';
import type { TraceTile } from '../src/game/types';

const size = 60, gap = 10, cell = 70;
const sv = <T,>(v: T) => ({ value: v }) as any;

function makeCtx(letters: string[][]): { ctx: TraceCtx; grid: (TraceTile | null)[][] } {
  let id = 1;
  const grid: (TraceTile | null)[][] = letters.map((row, r) =>
    row.map((letter, c) => ({ id: id++, letter, col: c, row: r, ci: 0 }))
  );
  const ctx: TraceCtx = {
    size, gap, cols: letters[0].length, rows: letters.length,
    grid: sv(grid), path: sv([]), lastPt: sv(null), hx: sv(0), hy: sv(0),
    depth: sv({}), addAt: sv({}), prefixes: sv({ c: 1, ca: 1, cat: 1 }),
  };
  return { ctx, grid };
}

const ctr = (r: number, c: number) => ({ x: c * cell + size / 2, y: r * cell + size / 2 });
const word = (ctx: TraceCtx) => ctx.path.value.map((t) => t.letter).join('');

let pass = 0;
const check = (name: string, cond: boolean) => {
  assert.ok(cond, name);
  pass++;
};

// 1: press selects (full-cell hit)
{
  const { ctx } = makeCtx([['c', 'a', 't'], ['x', 'e', 'z'], ['q', 'r', 's']]);
  check('press selects C', beginW(ctr(0, 0), ctx) && word(ctx) === 'c');
  // 2: fast flick interpolation — one huge move event picks up the crossed tile
  moveW({ x: ctr(0, 0).x + 4, y: ctr(0, 0).y }, ctx); // priming sample
  moveW(ctr(0, 2), ctx);
  check('flick interpolation walks c-a-t', word(ctx) === 'cat');
  // 3: backtrack magnet — retreating near A pops T
  moveW({ x: ctr(0, 1).x + 8, y: ctr(0, 1).y + 4 }, ctx);
  check('backtrack magnet pops to c-a', word(ctx) === 'ca');
  // 4: commit-to-select — dead corner between cells adds nothing
  const before = word(ctx);
  moveW({ x: cell - 2, y: cell - 2 }, ctx);
  check('gap corner is dead', word(ctx) === before);
}

// 5: deep retrace truncates to the recrossed tile
{
  const { ctx } = makeCtx([['c', 'a', 't'], ['x', 'e', 'z'], ['q', 'r', 's']]);
  beginW(ctr(0, 0), ctx);
  moveW({ x: ctr(0, 0).x + 5, y: ctr(0, 0).y + 5 }, ctx);
  moveW(ctr(1, 1), ctx);
  moveW(ctr(2, 1), ctx);
  check('c-e-r built', word(ctx) === 'cer');
  moveW(ctr(1, 1), ctx);
  check('deep retrace truncates to c-e', word(ctx) === 'ce');
}

// 6: mid-air exclusion — a null grid cell is never selectable
{
  const { ctx, grid } = makeCtx([['c', 'a', 't'], ['x', 'e', 'z'], ['q', 'r', 's']]);
  grid[1][1] = null; // E is airborne
  ctx.grid.value = grid;
  beginW(ctr(0, 0), ctx);
  moveW({ x: ctr(0, 0).x + 5, y: ctr(0, 0).y }, ctx);
  moveW(ctr(1, 1), ctx);
  check('airborne tile is unselectable', word(ctx) === 'c');
}

// 7: begin outside the board is a dead drag
{
  const { ctx } = makeCtx([['c', 'a', 't'], ['x', 'e', 'z'], ['q', 'r', 's']]);
  check('press off-board selects nothing', beginW({ x: -50, y: -50 }, ctx) === false && word(ctx) === '');
}

console.log(`trace: ${pass} headless checks passed`);
