// SUBMIT-SCORE — the leaderboard's honesty gate (Deno edge function).
// Clients lost direct INSERT on submissions (schema v2); every result comes
// through here, where the words are RE-SCORED with the engine ITSELF —
// the generated engine-core.js IS packages/engine/sworbl-core.js:
//   word points = round(sum(letterVal) * 10 * lenMult(len))
//   legal score = sum(word pts) + solve bonus in {0,75,200,350,500}
// Per-word slack ×8 covers streak (≤2×) and boost-stack tiles; the total
// must reconcile EXACTLY against the reward table.
// Deploy: npx supabase functions deploy submit-score
import { createClient } from "jsr:@supabase/supabase-js@2";
// THE REAL ENGINE (owner: game and backend score with the SAME code) —
// engine-core.js is a GENERATED copy of packages/engine/sworbl-core.js
// (see supabase/functions/deploy.sh); it attaches globalThis.SworblCore.
import "./engine-core.js";

// deno-lint-ignore no-explicit-any
const CORE = (globalThis as any).SworblCore as {
  letterVal: (letter: string, boost?: number) => number;
  lenMult: (n: number) => number;
};
const scoreWord = (w: string) =>
  Math.round([...w].reduce((s, ch) => s + CORE.letterVal(ch), 0) * 10 * CORE.lenMult(w.length));

// engine REWARD table (sworbl-daily.js) — the only legal solve bonuses
const BONUSES = [0, 75, 200, 350, 500];

const bad = (msg: string, status = 422) =>
  new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return bad("POST only", 405);

  // identity: the caller's own JWT (anonymous users included)
  const authHeader = req.headers.get("Authorization") ?? "";
  const asCaller = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (!user) return bad("not signed in", 401);

  let body: {
    day?: string; score?: number; solved?: boolean; guesses?: number;
    words?: { word?: string; pts?: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return bad("bad json", 400);
  }

  const { day, score, solved, guesses, words } = body;
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad("bad day");
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score >= 100000)
    return bad("bad score");
  if (typeof solved !== "boolean") return bad("bad solved");
  if (typeof guesses !== "number" || !Number.isInteger(guesses) || guesses < 0 || guesses > 6)
    return bad("bad guesses");
  if (!Array.isArray(words) || words.length > 80) return bad("bad words");

  // RE-SCORE: every word must be plausible against the engine's own math
  let sum = 0;
  for (const w of words) {
    if (!w || typeof w.word !== "string" || !/^[a-z]{3,8}$/.test(w.word)) return bad("bad word");
    if (typeof w.pts !== "number" || !Number.isInteger(w.pts) || w.pts < 0) return bad("bad pts");
    // ×8 slack: streak mult caps at 2×, boost-stack tiles cover the rest —
    // a 10× word is a cheat, not a lucky board
    if (w.pts > scoreWord(w.word) * 8) return bad(`implausible pts for ${w.word}`);
    sum += w.pts;
  }
  // the total must RECONCILE: score - word points is exactly a legal bonus
  const delta = score - sum;
  if (!BONUSES.includes(delta)) return bad("score does not reconcile");
  if (delta > 0 && !solved) return bad("bonus without solve");

  // validated: insert with the service role (clients have no INSERT policy)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await admin.from("submissions").insert({
    player_id: user.id,
    day,
    score,
    solved,
    guesses,
    words: words.map((w) => ({ word: w.word, pts: w.pts })),
  });
  // duplicate = already submitted = the day is one-shot: report delivered
  if (error && error.code !== "23505") return bad(error.message, 500);

  return new Response(JSON.stringify({ ok: true, duplicate: !!error }), {
    headers: { "Content-Type": "application/json" },
  });
});
