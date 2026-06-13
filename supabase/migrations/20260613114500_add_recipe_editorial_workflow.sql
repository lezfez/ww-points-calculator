alter table public.recipes
  add column if not exists status text not null default 'published',
  add column if not exists edited_by text,
  add column if not exists edited_at timestamptz,
  add column if not exists published_at timestamptz;

alter table public.recipes
  drop constraint if exists recipes_status_check;

alter table public.recipes
  add constraint recipes_status_check check (status in ('draft', 'published'));

create index if not exists recipes_status_idx on public.recipes(status);
create index if not exists recipes_edited_at_idx on public.recipes(edited_at desc);

create table if not exists public.recipe_history (
  id bigserial primary key,
  recipe_id integer not null references public.recipes(id) on delete cascade,
  action text not null check (action in ('edited', 'published', 'drafted', 'reverted')),
  changed_by text not null,
  changed_at timestamptz not null default now(),
  change_summary text,
  content jsonb not null default '{}'::jsonb
);

create index if not exists recipe_history_recipe_idx on public.recipe_history(recipe_id, changed_at desc);
create index if not exists recipe_history_action_idx on public.recipe_history(action);

comment on column public.recipes.status is 'Workflow-Status fuer redaktionelle Rezepttexte (draft|published)';
comment on column public.recipes.edited_by is 'Clerk User ID der letzten redaktionellen Aenderung';
comment on column public.recipes.edited_at is 'Zeitpunkt der letzten redaktionellen Aenderung';
comment on column public.recipes.published_at is 'Zeitpunkt der letzten Veroeffentlichung';
