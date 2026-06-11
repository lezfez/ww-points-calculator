import { useState, useCallback, useEffect } from "react";
import { supabase } from "../supabase";

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select(`id, name, coins, portionen, zeit, kategorie, hinweis, url,
        recipe_ingredients(ingredient, position),
        recipe_steps(step_text, position)`)
      .order("id");

    if (error) throw error;

    return (data || []).map(r => ({
      ...r,
      zutaten: [...(r.recipe_ingredients || [])]
        .sort((a, b) => a.position - b.position)
        .map(i => i.ingredient),
      zubereitung: [...(r.recipe_steps || [])]
        .sort((a, b) => a.position - b.position)
        .map(s => s.step_text)
        .join(" "),
    }));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mapped = await fetchRecipes();
      setRecipes(mapped);
    } catch (e) {
      setRecipes([]);
      setError(e?.message || "Rezepte konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [fetchRecipes]);

  useEffect(() => {
    let active = true;

    fetchRecipes()
      .then(mapped => {
        if (!active) return;
        setRecipes(mapped);
        setError(null);
      })
      .catch(e => {
        if (!active) return;
        setRecipes([]);
        setError(e?.message || "Rezepte konnten nicht geladen werden.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [fetchRecipes]);

  return { recipes, loading, error, reload };
}
