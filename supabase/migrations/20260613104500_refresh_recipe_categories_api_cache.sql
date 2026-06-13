-- Ensure PostgREST can see public.recipe_categories and refresh schema cache.

begin;

-- Make sure table exists (idempotent safety net)
create table if not exists public.recipe_categories (
  slug text primary key,
  label text not null unique,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Explicit API privileges
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.recipe_categories to authenticated, service_role;
grant select on table public.recipe_categories to anon;

-- Ensure fresh schema reflection in PostgREST
notify pgrst, 'reload schema';

commit;
