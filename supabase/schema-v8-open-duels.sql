-- SCHEMA V8 — OPEN DUELS (owner 2026-07-23: "current h2h that people wanna
-- have but no one has filled them in yet"). No lobbies, no claims: a duel
-- is a POSTED RUN on a seed, waiting for anyone to beat it. Taking one =
-- playing the same seed; the comparison is read from validated scores.
--   blitz  — 2:00, no theme, pure points
--   themed — 3:00 with clues + the word (needs featured_seeds content;
--            posting is format-agnostic, the client sets the clock)
create table if not exists public.open_duels (
  id bigint generated always as identity primary key,
  seed text not null check (seed ~ '^[a-z0-9-]{3,24}$'),
  poster uuid not null references public.players (id) on delete cascade,
  format text not null default 'blitz' check (format in ('blitz', 'themed')),
  score int not null check (score >= 0 and score < 100000),
  words jsonb not null default '[]'::jsonb, -- the ghost (future race bar)
  created_at timestamptz not null default now(),
  unique (seed, poster) -- one open post per player per board
);

create index if not exists open_duels_fresh on public.open_duels (created_at desc);

alter table public.open_duels enable row level security;

-- read: everyone (the home rail). write: post-duel edge function only
-- (service role) — it copies the score from the caller's VALIDATED
-- practice_scores row, so a posted duel can never carry an unvalidated
-- score. Posters may retract their own.
drop policy if exists "duels read all" on public.open_duels;
create policy "duels read all" on public.open_duels
  for select using (true);

drop policy if exists "duels delete own" on public.open_duels;
create policy "duels delete own" on public.open_duels
  for delete using (auth.uid() = poster);

-- the rail's join view: poster names ride along
create or replace view public.open_duel_board as
  select d.id, d.seed, d.format, d.score, d.created_at, d.poster, p.name
  from public.open_duels d
  join public.players p on p.id = d.poster;
