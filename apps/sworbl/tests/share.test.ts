// The share card contract — the text people paste into group chats.
import assert from 'assert';
import { buildShareText, puzzleNo } from '../src/game/share';

assert.strictEqual(puzzleNo('2026-07-01'), 1, 'epoch day is Nº 1');
assert.strictEqual(puzzleNo('2026-07-24'), 24, 'day math');

const solved = buildShareText({
  dayKey: '2026-07-24', archetypeLabel: 'connector',
  clues: ['a', 'b', 'c', 'd', 'e', 'f'],
  found: ['a', 'b', 'd', 'e', 'x', 'y'], // 4 core + 2 bonus words
  solved: true, guessesUsed: 3, score: 4120,
});
assert.strictEqual(
  solved,
  'sworbl Nº 24 · connector\n🟪🟦⬛🟥🟨⬛ 4/6 · +2 bonus\n⬛⬛🟪 cracked in 3\n4,120 pts',
  'solved card'
);

const failed = buildShareText({
  dayKey: '2026-07-20', archetypeLabel: null,
  clues: ['a', 'b', 'c', 'd', 'e', 'f'], found: ['a'],
  solved: false, guessesUsed: 6, score: 900,
});
assert.strictEqual(
  failed,
  'sworbl Nº 20\n🟪⬛⬛⬛⬛⬛ 1/6\n⬛⬛⬛⬛⬛⬛ ✗ not cracked\n900 pts',
  'failed card'
);

const fire = buildShareText({
  dayKey: '2026-07-24', archetypeLabel: null,
  clues: ['a', 'b', 'c', 'd', 'e', 'f'], found: ['a'],
  solved: true, guessesUsed: 1, score: 2000, streak: 5,
});
assert.ok(fire.endsWith('2,000 pts · 🔥 5'), 'streak rides the score line');
const noFire = buildShareText({
  dayKey: '2026-07-24', archetypeLabel: null,
  clues: ['a', 'b', 'c', 'd', 'e', 'f'], found: ['a'],
  solved: true, guessesUsed: 1, score: 2000, streak: 1,
});
assert.ok(noFire.endsWith('2,000 pts'), 'a 1-day streak stays quiet');

console.log('share: card format pinned (solved, failed, bonus, untagged, streak)');

// MODES (modes-spec: ONE mode, round decay) — no hard badge anywhere;
// ≥2 rounds wears the 'best of N rounds' tag on the score line
{
  const multi = buildShareText({
    dayKey: '2026-07-24', archetypeLabel: null,
    clues: ['a', 'b', 'c', 'd', 'e', 'f'], found: ['a'],
    solved: false, guessesUsed: 1, score: 900, rounds: 4,
  });
  assert.ok(!multi.includes('HARD'), 'no hard badge — the mode is dead');
  assert.ok(multi.includes('· best of 4 rounds'), 'multi-round tag on the score line');
  const single = buildShareText({
    dayKey: '2026-07-24', archetypeLabel: null,
    clues: ['a', 'b', 'c', 'd', 'e', 'f'], found: ['a'],
    solved: false, guessesUsed: 1, score: 900, rounds: 1,
  });
  assert.ok(!single.includes('best of'), 'single round wears no tag');
}
console.log('share: card format pinned (solved, failed, bonus, untagged, streak, modes)');
