-- SCHEMA V10 — APP CONFIG (owner: "a full torch of what the games
-- currently have in their calendar"). One tiny key/value table the app
-- polls at its existing phone-home moments (boot / foreground / PTR).
-- THE TORCH: bump content_epoch and every client drops its cached
-- content + current day state on its next open, then re-deals fresh
-- from the server. No push infrastructure needed.
--
--   UPDATE public.app_config
--   SET value = to_jsonb((value::text)::int + 1), updated_at = now()
--   WHERE key = 'content_epoch';
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "config read all" on public.app_config;
create policy "config read all" on public.app_config
  for select using (true);
-- writes: dashboard/service only

insert into public.app_config (key, value)
  values ('content_epoch', '1'::jsonb)
  on conflict (key) do nothing;
