-- SWORBL — schema v6: DUELS GROUNDWORK (ghost duels + groups, see
-- docs/modes-spec.md). Run after v5. Client work follows next sessions;
-- deploying this early is safe — nothing reads it yet.

-- practice runs carry their words: the ghost REPLAYS them during a duel
alter table public.practice_scores
  add column if not exists words jsonb not null default '[]'::jsonb;

-- featured seeds: the browsable board list (publish via dashboard)
create table if not exists public.featured_seeds (
  seed text primary key check (seed ~ '^[a-z0-9-]{3,24}$'),
  title text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.featured_seeds enable row level security;
create policy "featured read all" on public.featured_seeds
  for select using (true);

-- GROUPS (owner: public or private, own leaderboards = filters)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 20),
  owner uuid not null references public.players (id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
create policy "groups read all" on public.groups for select using (true);
create policy "groups create own" on public.groups
  for insert with check (auth.uid() = owner);
create policy "members read all" on public.group_members for select using (true);
create policy "members join self" on public.group_members
  for insert with check (auth.uid() = player_id);
create policy "members leave self" on public.group_members
  for delete using (auth.uid() = player_id);
