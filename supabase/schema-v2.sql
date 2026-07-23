-- SWORBL — schema v2: the production-hardening pass.
-- Run in the Supabase SQL editor AFTER schema.sql. Two moves:
--   1. alltime_totals: a trigger-maintained aggregate — the old view
--      re-summed the ENTIRE submissions table on every request and would
--      get hammered as history grows (owner). Now one indexed read.
--   2. the one-shot law moves server-side: clients lose direct INSERT on
--      submissions; only the submit-score edge function (service role,
--      after re-scoring the words) writes results.

-- ---- all-time totals: maintained by trigger, read by the view ----------
create table if not exists public.alltime_totals (
  player_id uuid primary key references public.players (id) on delete cascade,
  total int not null default 0,
  days int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.alltime_totals enable row level security;
create policy "alltime read all" on public.alltime_totals
  for select using (true);
-- no insert/update policies: only the trigger (definer) writes

create or replace function public.bump_alltime()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.alltime_totals as t (player_id, total, days)
  values (new.player_id, new.score, 1)
  on conflict (player_id) do update
    set total = t.total + new.score,
        days = t.days + 1,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists submissions_bump_alltime on public.submissions;
create trigger submissions_bump_alltime
  after insert on public.submissions
  for each row execute function public.bump_alltime();

-- backfill existing history once (idempotent)
insert into public.alltime_totals (player_id, total, days)
select player_id, sum(score)::int, count(*)::int
from public.submissions
group by player_id
on conflict (player_id) do update
  set total = excluded.total, days = excluded.days, updated_at = now();

-- the view keeps its column contract (name, total, days, rank, player_id)
-- but now reads the aggregate — O(players), not O(all submissions ever)
create or replace view public.alltime_standings as
  select t.player_id, p.name, t.total, t.days,
         rank() over (order by t.total desc) as rank
  from public.alltime_totals t
  join public.players p on p.id = t.player_id;

-- ---- the one-shot law is SERVER-SIDE now --------------------------------
-- clients can no longer insert results directly; the submit-score edge
-- function re-scores the words and inserts with the service role.
drop policy if exists "submissions insert self" on public.submissions;
