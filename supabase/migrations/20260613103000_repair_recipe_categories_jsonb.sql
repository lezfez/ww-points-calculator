-- Repair migration: ensure recipe_categories and recipes.kategorien exist even
-- if older migration history was marked as applied without running SQL.

begin;

create table if not exists public.recipe_categories (
  slug text primary key,
  label text not null unique,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.recipe_categories (slug, label, sort_order, is_active)
values
  ('hauptspeise', 'Hauptspeise', 10, true),
  ('beilage-aufstrich', 'Beilage / Aufstrich', 20, true),
  ('dessert', 'Dessert', 30, true),
  ('vegetarisch', 'Vegetarisch', 40, true),
  ('snack', 'Snack', 50, true)
on conflict (slug) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

alter table public.recipes
  add column if not exists kategorien jsonb not null default '[]'::jsonb;

create or replace function public.slugify_category(input_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.jsonb_is_text_array(j jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(j) = 'array'
    and coalesce(
      (
        select bool_and(jsonb_typeof(value) = 'string')
        from jsonb_array_elements(j)
      ),
      true
    )
$$;

with derived as (
  select distinct public.slugify_category(part) as slug
  from public.recipes r,
       unnest(regexp_split_to_array(coalesce(r.kategorie, ''), '\\s*,\\s*')) as part
  where btrim(coalesce(r.kategorie, '')) <> ''
)
insert into public.recipe_categories (slug, label, sort_order, is_active)
select slug, initcap(replace(slug, '-', ' ')), 900, true
from derived
where slug <> ''
on conflict (slug) do nothing;

update public.recipes r
set kategorien = (
  select coalesce(jsonb_agg(slug order by slug), '[]'::jsonb)
  from (
    select distinct public.slugify_category(part) as slug
    from unnest(regexp_split_to_array(coalesce(r.kategorie, ''), '\\s*,\\s*')) as part
  ) s
  where s.slug <> ''
)
where btrim(coalesce(r.kategorie, '')) <> ''
  and (r.kategorien = '[]'::jsonb or r.kategorien is null);

create or replace function public.validate_recipe_kategorien()
returns trigger
language plpgsql
as $$
declare
  cat_slug text;
begin
  if new.kategorien is null then
    new.kategorien := '[]'::jsonb;
  end if;

  if not public.jsonb_is_text_array(new.kategorien) then
    raise exception 'recipes.kategorien must be a JSON array of strings';
  end if;

  new.kategorien := (
    select coalesce(jsonb_agg(slug order by slug), '[]'::jsonb)
    from (
      select distinct public.slugify_category(value) as slug
      from jsonb_array_elements_text(new.kategorien) as value
    ) x
    where slug <> ''
  );

  for cat_slug in
    select value from jsonb_array_elements_text(new.kategorien)
  loop
    if not exists (
      select 1
      from public.recipe_categories c
      where c.slug = cat_slug
        and c.is_active = true
    ) then
      raise exception 'Unknown or inactive recipe category slug: %', cat_slug;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_validate_recipe_kategorien on public.recipes;

create trigger trg_validate_recipe_kategorien
before insert or update of kategorien
on public.recipes
for each row
execute function public.validate_recipe_kategorien();

create index if not exists recipes_kategorien_gin_idx
  on public.recipes
  using gin (kategorien jsonb_path_ops);

commit;
