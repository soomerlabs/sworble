-- SWORBL — schema v3: SERVER-DRIVEN DAILIES (owner: swap tester content
-- rapidly, no app release, no waiting a day; also closes the spoiler hole —
-- future answers stop shipping inside the app bundle).
-- The app merges these rows OVER its bundled dailies.json: a row here wins
-- for its day; days without a row fall back to the bundle (offline law).

create table if not exists public.dailies (
  day text primary key check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  -- the full day spec, SAME SHAPE as a dailies.json entry:
  -- { "sworb": "ocean", "themeWords": [...], "definition": "...",
  --   "archetype": "straight-category" }
  content jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.dailies enable row level security;
create policy "dailies read all" on public.dailies
  for select using (true);
-- no client write policies: publish via the dashboard/SQL editor only

-- ---- HOW TO PUBLISH / SWAP A DAY (run in the SQL editor) ----------------
-- insert into public.dailies (day, content) values (
--   '2026-07-24',
--   '{"sworb":"amber","themeWords":["gold","resin","glow","honey","fossil"],
--     "definition":"fossilized tree resin, prized as a gem",
--     "archetype":"straight-category"}'::jsonb
-- )
-- on conflict (day) do update
--   set content = excluded.content, updated_at = now();
--
-- Testers pick the new content up on their next app focus, IF they have
-- not started that day's round (mid-round content never swaps — the
-- never-re-deal-mid-round law holds server-side too).
