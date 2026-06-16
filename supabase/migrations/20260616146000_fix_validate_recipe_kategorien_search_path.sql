-- Fix mutable search_path. All references in the body are already schema-qualified.
CREATE OR REPLACE FUNCTION public.validate_recipe_kategorien()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
$function$;
