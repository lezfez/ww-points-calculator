-- Fix mutable search_path: add SET search_path = '' to prevent search_path hijacking.
CREATE OR REPLACE FUNCTION public.jsonb_is_text_array(j jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path = ''
AS $function$
  select
    jsonb_typeof(j) = 'array'
    and coalesce(
      (
        select bool_and(jsonb_typeof(value) = 'string')
        from jsonb_array_elements(j)
      ),
      true
    )
$function$;
