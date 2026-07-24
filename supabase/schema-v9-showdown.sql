-- SCHEMA V9 — SHOWDOWNS (owner rename + ruling: taking one CLAIMS it 1v1;
-- once decided it leaves the rail). Lifecycle: open → taken → decided.
-- Points for now (owner: "points is fine"): +10 win, +2 played.

alter table public.open_duels
  add column if not exists status text not null default 'open'
    check (status in ('open', 'taken', 'decided')),
  add column if not exists taker uuid references public.players (id) on delete set null,
  add column if not exists taker_score int,
  add column if not exists winner uuid;

alter table public.players
  add column if not exists showdown_points int not null default 0;

-- the rail shows OPEN showdowns only — decided ones are history
create or replace view public.open_duel_board as
  select d.id, d.seed, d.format, d.score, d.words, d.created_at, d.poster, p.name
  from public.open_duels d
  join public.players p on p.id = d.poster
  where d.status = 'open';

-- writes stay service-role only (the showdown edge function drives the
-- lifecycle); posters keep delete-own for retracting an untaken post
