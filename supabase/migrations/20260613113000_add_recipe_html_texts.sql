alter table public.recipes
  add column if not exists short_description_html text,
  add column if not exists instructions_html text;

comment on column public.recipes.short_description_html is 'Sanitisiertes HTML fuer Rezept-Kurzbeschreibung (Admin pflegbar)';
comment on column public.recipes.instructions_html is 'Sanitisiertes HTML fuer Rezept-Zubereitung (Admin pflegbar)';