import fs from "node:fs";
import { Buffer } from "node:buffer";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "recipe-images";
const DEFAULT_IMAGE_MODEL = "gpt-image-1.5";
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY = "medium";
const DEFAULT_FORMAT = "webp";

function loadEnvFile(filePath = ".env.local") {
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {
    bucket: process.env.RECIPE_IMAGE_BUCKET || DEFAULT_BUCKET,
    dryRun: false,
    force: false,
    limit: 5,
    recipeId: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--all") args.limit = null;
    else if (arg === "--limit") args.limit = Number(argv[++i]);
    else if (arg === "--recipe-id") args.recipeId = Number(argv[++i]);
    else if (arg === "--bucket") args.bucket = argv[++i];
    else {
      throw new Error(`Unbekanntes Argument: ${arg}`);
    }
  }

  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error("--limit muss eine positive Ganzzahl sein.");
  }

  if (args.recipeId !== null && (!Number.isInteger(args.recipeId) || args.recipeId < 1)) {
    throw new Error("--recipe-id muss eine positive Ganzzahl sein.");
  }

  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt.`);
  return value;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "rezept";
}

function buildPrompt(recipe) {
  const ingredients = recipe.zutaten.join(", ");
  const steps = recipe.zubereitung.slice(0, 900);

  return [
    "Use case: photorealistic-natural",
    "Asset type: recipe card image for a German Weight Watchers-style recipe app",
    `Primary request: Create a realistic food photograph for the recipe "${recipe.name}".`,
    "Scene/backdrop: natural daylight on a simple warm kitchen or dining table, editorial food photography, realistic colors.",
    `Subject: the finished dish as implied by these ingredients: ${ingredients}.`,
    `Preparation context: ${steps}`,
    "Composition: 3/4 overhead view, finished dish centered, ingredients visibly recognizable, appetizing but honest home-cooked texture.",
    "Style: photorealistic, natural shadows, realistic steam only if appropriate, no people.",
    "Avoid: no text, no labels, no watermark, no logo, no packaging, no unrelated dishes, no exaggerated garnish.",
  ].join("\n");
}

function mapRecipe(recipe) {
  const ingredients = [...(recipe.recipe_ingredients || [])]
    .sort((a, b) => a.position - b.position)
    .map(i => i.ingredient);

  const steps = [...(recipe.recipe_steps || [])]
    .sort((a, b) => a.position - b.position)
    .map(s => s.step_text)
    .join(" ");

  return { ...recipe, zutaten: ingredients, zubereitung: steps };
}

async function ensureBucket(supabase, bucket) {
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (!error && data) return;

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: "8MB",
    allowedMimeTypes: ["image/webp", "image/png", "image/jpeg"],
  });

  if (createError) throw createError;
}

async function fetchRecipes(supabase, args) {
  let query = supabase
    .from("recipes")
    .select(`id, name, coins, portionen, zeit, kategorie, hinweis, image_url, image_path, image_status,
      recipe_ingredients(ingredient, position),
      recipe_steps(step_text, position)`)
    .order("id");

  if (args.recipeId) query = query.eq("id", args.recipeId);
  if (!args.force) query = query.or("image_url.is.null,image_status.eq.failed");
  if (args.limit) query = query.limit(args.limit);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapRecipe);
}

async function generateImage(prompt) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${requireEnv("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
      prompt,
      size: process.env.RECIPE_IMAGE_SIZE || DEFAULT_SIZE,
      quality: process.env.RECIPE_IMAGE_QUALITY || DEFAULT_QUALITY,
      output_format: process.env.RECIPE_IMAGE_FORMAT || DEFAULT_FORMAT,
      background: "opaque",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `OpenAI Image API Fehler (${response.status})`;
    throw new Error(message);
  }

  const image = payload.data?.[0]?.b64_json;
  if (!image) throw new Error("OpenAI Image API hat kein b64_json Bild geliefert.");

  return Buffer.from(image, "base64");
}

async function uploadImage(supabase, bucket, recipe, imageBuffer) {
  const extension = process.env.RECIPE_IMAGE_FORMAT || DEFAULT_FORMAT;
  const imagePath = `recipes/${String(recipe.id).padStart(4, "0")}-${slugify(recipe.name)}.${extension}`;
  const contentType = `image/${extension === "jpg" ? "jpeg" : extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(imagePath, imageBuffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(imagePath);
  return { imagePath, publicUrl: data.publicUrl };
}

async function markRecipe(supabase, recipeId, updates) {
  const { error } = await supabase
    .from("recipes")
    .update(updates)
    .eq("id", recipeId);

  if (error) throw error;
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl) throw new Error("SUPABASE_URL oder VITE_SUPABASE_URL fehlt.");

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  if (!args.dryRun) await ensureBucket(supabase, args.bucket);

  const recipes = await fetchRecipes(supabase, args);
  if (recipes.length === 0) {
    console.log("Keine passenden Rezepte gefunden.");
    return;
  }

  for (const recipe of recipes) {
    const prompt = buildPrompt(recipe);
    console.log(`\n# ${recipe.id}: ${recipe.name}`);

    if (args.dryRun) {
      console.log(prompt);
      continue;
    }

    try {
      await markRecipe(supabase, recipe.id, {
        image_status: "generating",
        image_prompt: prompt,
      });

      const imageBuffer = await generateImage(prompt);
      const { imagePath, publicUrl } = await uploadImage(supabase, args.bucket, recipe, imageBuffer);

      await markRecipe(supabase, recipe.id, {
        image_url: publicUrl,
        image_path: imagePath,
        image_prompt: prompt,
        image_status: "ready",
        image_generated_at: new Date().toISOString(),
      });

      console.log(`Fertig: ${publicUrl}`);
    } catch (error) {
      await markRecipe(supabase, recipe.id, {
        image_status: "failed",
        image_prompt: prompt,
      }).catch(() => {});

      console.error(`Fehlgeschlagen: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
