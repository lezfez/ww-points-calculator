-- Security hardening: RLS + GRANT fixes
-- Fixes:
--   1. feature_flags wildcard write policy (anyone could change flags via anon key)
--   2. RLS disabled on daily_journal, user_profiles, foods, app_settings,
--      recipe_categories, recipe_history (private or admin-only tables)
--   3. anon/authenticated had INSERT/UPDATE/DELETE on all tables

begin;

-- 1. feature_flags: drop wildcard write policy
drop policy if exists "feature_flags_write" on public.feature_flags;

-- 2. Enable RLS on all previously unprotected tables
alter table public.daily_journal     enable row level security;
alter table public.user_profiles     enable row level security;
alter table public.foods             enable row level security;
alter table public.app_settings      enable row level security;
alter table public.recipe_categories enable row level security;
alter table public.recipe_history    enable row level security;

-- 3. Public SELECT policies for non-sensitive reference tables
drop policy if exists "public read" on public.recipe_categories;
create policy "public read" on public.recipe_categories
  for select to anon, authenticated using (true);

drop policy if exists "public read" on public.app_settings;
create policy "public read" on public.app_settings
  for select to anon, authenticated using (true);

drop policy if exists "public read" on public.foods;
create policy "public read" on public.foods
  for select to anon, authenticated using (true);

-- daily_journal, user_profiles, recipe_history: no policies
-- → only service_role (API routes) can access these tables

-- 4. Revoke write privileges from anon (least privilege)
revoke insert, update, delete, truncate, references, trigger
  on public.activity_factors     from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.app_settings         from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.daily_journal        from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.feature_flags        from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.foods                from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.formula_coefficients from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.recipe_categories    from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.recipe_history       from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.recipe_ingredients   from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.recipe_steps         from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.recipes              from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.systems              from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.user_profiles        from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.zero_point_foods     from anon;

-- 5. Revoke write privileges from authenticated
-- All writes go through service_role in API routes; Clerk handles auth externally
revoke insert, update, delete, truncate, references, trigger
  on public.activity_factors     from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.app_settings         from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.daily_journal        from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.feature_flags        from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.foods                from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.formula_coefficients from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.recipe_categories    from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.recipe_history       from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.recipe_ingredients   from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.recipe_steps         from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.recipes              from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.systems              from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.user_profiles        from authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.zero_point_foods     from authenticated;

commit;
