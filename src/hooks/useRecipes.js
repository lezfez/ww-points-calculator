import { useState, useCallback, useEffect } from "react";
import { supabase } from "../supabase";

const BASE_RECIPE_SELECT = `id, name, coins, portionen, zeit, kategorie, hinweis, url,
  recipe_ingredients(ingredient, position),
  recipe_steps(step_text, position)`;

const RECIPE_SELECT_WITH_IMAGES = `id, name, coins, portionen, zeit, kategorie, hinweis, url,
  image_url, image_path, image_prompt, image_status, image_generated_at,
  recipe_ingredients(ingredient, position),
  recipe_steps(step_text, position)`;

function mapRecipe(r) {
  return {
    ...r,
    zutaten: [...(r.recipe_ingredients || [])]
      .sort((a, b) => a.position - b.position)
      .map(i => i.ingredient),
    zubereitung: [...(r.recipe_steps || [])]
      .sort((a, b) => a.position - b.position)
      .map(s => s.step_text)
      .join(" "),
  };
}

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecipes = useCallback(async () => {
    const imageQuery = await supabase
      .from("recipes")
      .select(RECIPE_SELECT_WITH_IMAGES)
      .order("id");

    let data = imageQuery.data;
    let error = imageQuery.error;

    if (error?.code === "42703") {
      const fallbackQuery = await supabase
        .from("recipes")
        .select(BASE_RECIPE_SELECT)
        .order("id");

      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (error) throw error;

    return (data || []).map(mapRecipe);
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
