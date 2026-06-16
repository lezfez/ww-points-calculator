-- Fix mutable search_path: add SET search_path = '' to prevent search_path hijacking.
CREATE OR REPLACE FUNCTION public.slugify_category(input_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = ''
AS $function$
  select trim(both '-' from regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9]+', '-', 'g'))
$function$;
