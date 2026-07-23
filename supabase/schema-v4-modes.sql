-- SWORBL — schema v4: THE MODES (regular replayable / hard one-shot /
-- practice per-seed). Run AFTER schema-v2. See docs/modes-spec.md.

-- ---- submissions learn their mode ---------------------------------------
-- existing rows were one-shot days = hard-shaped history
alter table public.submissions
  add column if not exists mode text not null default 'hard'
  check (mode in ('regular', 'hard'));

-- regular is keep-best: the function UPDATES a row when a better best-round
-- lands, so the totals trigger needs an UPDATE arm (delta, not re-add)
create or replace function public.bump_alltime()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.alltime_totals as t (player_id, total, days)
    values (new.player_id, new.score, 1)
    on conflict (player_id) do update
      set total = t.total + new.score,
          days = t.days + 1,
          updated_at = now();
  elsif tg_op = 'UPDATE' then
    update public.alltime_totals
      set total = total + (new.score - old.score),
          updated_at = now()
      where player_id = new.player_id;
  end if;
  return new;
end;
$$;

drop trigger if exists submissions_bump_alltime on public.submissions;
create trigger submissions_bump_alltime
  after insert or update of score on public.submissions
  for each row execute function public.bump_alltime();

-- daily standings carry the mode so the boards can split.
-- DROP first: CREATE OR REPLACE can only APPEND view columns — inserting
-- mode before rank reads as a rename and errors (42P16). Views hold no
-- data; dropping is free.
drop view if exists public.daily_standings;
create view public.daily_standings as
  select s.day, s.player_id, p.name, s.score, s.solved, s.mode,
         rank() over (partition by s.day, s.mode order by s.score desc) as rank
  from public.submissions s
  join public.players p on p.id = s.player_id;

-- ---- practice: per-seed keep-best ----------------------------------------
create table if not exists public.practice_scores (
  player_id uuid not null references public.players (id) on delete cascade,
  seed text not null check (seed ~ '^[a-z0-9-]{3,24}$'),
  score int not null check (score >= 0 and score < 100000),
  updated_at timestamptz not null default now(),
  primary key (player_id, seed)
);

create index if not exists practice_seed_score on public.practice_scores (seed, score desc);

alter table public.practice_scores enable row level security;
create policy "practice read all" on public.practice_scores
  for select using (true);
-- writes: submit-score only (service role)

create or replace view public.practice_standings as
  select ps.seed, ps.player_id, p.name, ps.score,
         rank() over (partition by ps.seed order by ps.score desc) as rank
  from public.practice_scores ps
  join public.players p on p.id = ps.player_id;
