-- Fix: v_recipes_full was implicitly SECURITY DEFINER (Postgres default),
-- which caused the view to bypass RLS of the querying user.
-- Recreate with security_invoker = on so the caller's RLS context is enforced.
CREATE OR REPLACE VIEW public.v_recipes_full
WITH (security_invoker = on)
AS
 SELECT r.id,
    r.name,
    r.coins,
    r.portionen,
    r.zeit,
    r.kategorie,
    r.hinweis,
    r.url,
    array_agg(ri.ingredient ORDER BY ri."position") AS zutaten,
    array_agg(rs.step_text ORDER BY rs."position") AS schritte
   FROM ((recipes r
     LEFT JOIN recipe_ingredients ri ON ((ri.recipe_id = r.id)))
     LEFT JOIN recipe_steps rs ON ((rs.recipe_id = r.id)))
  GROUP BY r.id, r.name, r.coins, r.portionen, r.zeit, r.kategorie, r.hinweis, r.url
  ORDER BY r.id;
