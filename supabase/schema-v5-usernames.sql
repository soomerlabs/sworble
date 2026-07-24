-- SWORBL — schema v5: UNIQUE USERNAMES (owner: "username is what games
-- do" — one way to link a person; friend codes are out). Names are stored
-- uppercase-only (the charset check), so uniqueness is exact-match.

-- 0) resolve any existing duplicates FIRST (keeps the earliest claimant,
--    renames later ones by suffixing digits) — idempotent, usually no-op
with dupes as (
  select id, name,
         row_number() over (partition by name order by created_at) as rn
  from public.players
)
update public.players p
set name = left(p.name, 10 - 4) || lpad((floor(random() * 10000))::int::text, 4, '0')
from dupes d
where p.id = d.id and d.rn > 1;

-- 1) the law: one name, one player
create unique index if not exists players_name_unique
  on public.players (name);
