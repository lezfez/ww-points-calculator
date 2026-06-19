-- recipe_favorites: per-user saved recipes (server-only via service role, no RLS policies needed)
create table if not exists public.recipe_favorites (
  id          bigint generated always as identity primary key,
  user_id     text        not null,
  recipe_id   text        not null,
  created_at  timestamptz not null default now(),
  constraint recipe_favorites_user_recipe unique (user_id, recipe_id)
);

create index if not exists recipe_favorites_user_idx on public.recipe_favorites (user_id, created_at desc);

alter table public.recipe_favorites enable row level security;

-- No RLS policies: table is accessed exclusively via service role in api/user-profile.js
revoke all on public.recipe_favorites from anon;
revoke all on public.recipe_favorites from authenticated;
