-- Personal food favorites per user (server-only via service role, no RLS policies needed)
create table if not exists public.food_favorites (
  id          bigint generated always as identity primary key,
  user_id     text        not null,
  name        text        not null,
  coins       integer     not null,
  created_at  timestamptz not null default now(),
  constraint food_favorites_user_item unique (user_id, name, coins)
);

create index if not exists food_favorites_user_idx on public.food_favorites (user_id, created_at desc);

alter table public.food_favorites enable row level security;

-- No RLS policies: table is accessed exclusively via service role in api/user-profile.js
revoke all on public.food_favorites from anon;
revoke all on public.food_favorites from authenticated;
