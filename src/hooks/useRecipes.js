import { useState, useCallback, useEffect } from "react";
import { supabase } from "../supabase";

const BASE_RECIPE_SELECT = `id, name, coins, portionen, zeit, kategorie, hinweis, url,
  recipe_ingredients(ingredient, position),
  recipe_steps(step_text, position)`;

const RECIPE_SELECT_WITH_TEXTS = `id, name, coins, portionen, zeit, kategorie, hinweis, url,
  short_description_html, instructions_html,
  recipe_ingredients(ingredient, position),
  recipe_steps(step_text, position)`;

const RECIPE_SELECT_WITH_IMAGES = `id, name, coins, portionen, zeit, kategorie, hinweis, url,
  image_url, image_path, image_prompt, image_status, image_generated_at,
  recipe_ingredients(ingredient, position),
  recipe_steps(step_text, position)`;

const RECIPE_SELECT_WITH_IMAGES_AND_TEXTS = `id, name, coins, portionen, zeit, kategorie, hinweis, url,
  short_description_html, instructions_html,
  image_url, image_path, image_prompt, image_status, image_generated_at,
  recipe_ingredients(ingredient, position),
  recipe_steps(step_text, position)`;

const RECIPE_SELECT_WITH_IMAGES_AND_CATEGORIES = `id, name, coins, portionen, zeit, kategorie, kategorien, hinweis, url,
  short_description_html, instructions_html,
  image_url, image_path, image_prompt, image_status, image_generated_at,
  recipe_ingredients(ingredient, position),
  recipe_steps(step_text, position)`;

const RECIPE_SELECT_WITH_IMAGES_AND_CATEGORIES_NO_TEXTS = `id, name, coins, portionen, zeit, kategorie, kategorien, hinweis, url,
  image_url, image_path, image_prompt, image_status, image_generated_at,
  recipe_ingredients(ingredient, position),
  recipe_steps(step_text, position)`;

function slugifyCategory(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function labelFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtmlParagraphs(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map(part => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function withImageVersion(url, generatedAt) {
  const raw = String(url || "").trim();
  if (!raw) return raw;

  const version = String(generatedAt || "").trim();
  if (!version) return raw;

  const separator = raw.includes("?") ? "&" : "?";
  return `${raw}${separator}v=${encodeURIComponent(version)}`;
}

function mapRecipe(r) {
  const legacyLabels = String(r.kategorie || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  const categorySlugs = Array.isArray(r.kategorien)
    ? [...new Set(r.kategorien.map(slugifyCategory).filter(Boolean))]
    : [...new Set(legacyLabels.map(slugifyCategory).filter(Boolean))];

  const categoryLabels = legacyLabels.length > 0
    ? legacyLabels
    : categorySlugs.map(labelFromSlug);

  const sortedSteps = [...(r.recipe_steps || [])]
    .sort((a, b) => a.position - b.position)
    .map(s => s.step_text)
    .filter(Boolean);

  const legacyPreparationText = sortedSteps.join(" ");
  const shortDescriptionHtml = typeof r.short_description_html === "string"
    ? r.short_description_html
    : "";
  const instructionsHtml = typeof r.instructions_html === "string"
    ? r.instructions_html
    : "";

  return {
    ...r,
    image_url: withImageVersion(r.image_url, r.image_generated_at),
    kategorien: categorySlugs,
    kategorienLabels: categoryLabels,
    kategorie: categoryLabels.join(", "),
    shortDescriptionHtml: shortDescriptionHtml || plainTextToHtmlParagraphs(r.hinweis),
    instructionsHtml: instructionsHtml || plainTextToHtmlParagraphs(legacyPreparationText),
    zutaten: [...(r.recipe_ingredients || [])]
      .sort((a, b) => a.position - b.position)
      .map(i => i.ingredient),
    zubereitung: legacyPreparationText,
  };
}

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecipes = useCallback(async () => {
    const fullQuery = await supabase
      .from("recipes")
      .select(RECIPE_SELECT_WITH_IMAGES_AND_CATEGORIES)
      .order("id");

    let data = fullQuery.data;
    let error = fullQuery.error;

    if (error?.code === "42703") {
      const imageAndTextFallbackQuery = await supabase
        .from("recipes")
        .select(RECIPE_SELECT_WITH_IMAGES_AND_TEXTS)
        .order("id");

      data = imageAndTextFallbackQuery.data;
      error = imageAndTextFallbackQuery.error;
    }

    if (error?.code === "42703") {
      const imageAndCategoriesFallbackQuery = await supabase
        .from("recipes")
        .select(RECIPE_SELECT_WITH_IMAGES_AND_CATEGORIES_NO_TEXTS)
        .order("id");

      data = imageAndCategoriesFallbackQuery.data;
      error = imageAndCategoriesFallbackQuery.error;
    }

    if (error?.code === "42703") {
      const imageFallbackQuery = await supabase
        .from("recipes")
        .select(RECIPE_SELECT_WITH_IMAGES)
        .order("id");

      data = imageFallbackQuery.data;
      error = imageFallbackQuery.error;
    }

    if (error?.code === "42703") {
      const textFallbackQuery = await supabase
        .from("recipes")
        .select(RECIPE_SELECT_WITH_TEXTS)
        .order("id");

      data = textFallbackQuery.data;
      error = textFallbackQuery.error;
    }

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
