import { createClerkClient, verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "recipe-images";
const HF_MODEL = "black-forest-labs/FLUX.1-schnell";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ═══════════════════════════════════════════════════════════
// IMPROVED PROMPT GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Extrahiere visuelle Zutaten-Beschreibungen aus der Zutatenliste
 * Erzeugt spezifische Farb- und Textur-Beschreibungen
 */
function extractVisualIngredients(ingredients) {
  const visual = [];
  const ingredientText = (ingredients || [])
    .map(i => (typeof i === 'string' ? i : i.ingredient).toLowerCase())
    .join(' ');
  
  // Systematische Mapping von Zutaten zu visuellen Eigenschaften
  const mappings = {
    'avocado': 'creamy green avocado',
    'tofu': 'golden crispy tofu',
    'brokkoli|broccoli': 'vibrant green broccoli',
    'paprika|bell pepper': 'bright red bell pepper strips',
    'rote bete|beetroot': 'deep purple beetroot',
    'karotte|carrot': 'orange carrot slices',
    'spinat|spinach': 'fresh dark green spinach',
    'rucola|arugula': 'peppery green arugula',
    'tahini|sesammus': 'creamy tahini dressing',
    'kichererbsen|chickpeas': 'roasted chickpeas',
    'zuckerschoten|snap peas': 'crisp snap peas',
    'sesam|sesame': 'sesame seeds',
    'tomato|tomate': 'juicy tomatoes',
    'gurke|cucumber': 'crisp cucumber',
    'zwiebel|onion': 'caramelized onions',
    'knoblauch|garlic': 'fresh garlic',
    'käse|cheese': 'melted cheese',
    'ei|egg': 'sunny-side eggs',
    'pilz|mushroom': 'sautéed mushrooms',
    'zucchini': 'grilled zucchini',
    'aubergine': 'roasted eggplant',
    'linsen|lentils': 'cooked lentils',
    'koriander|cilantro': 'fresh cilantro',
    'minze|mint': 'fresh mint leaves',
    'limone|lime': 'lime wedges',
    'zitrone|lemon': 'lemon slices',
    'feta': 'crumbled feta cheese',
    'mozzarella': 'melted mozzarella',
    'hähnchen|chicken': 'grilled chicken breast',
    'lachs|salmon': 'cooked salmon fillet',
    'shrimp|garnelen': 'cooked shrimp',
    'vollkorn|grain': 'wholegrains',
    'reis|rice': 'cooked rice',
    'nudel|pasta': 'cooked pasta',
  };

  Object.entries(mappings).forEach(([pattern, visual_desc]) => {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(ingredientText)) {
      visual.push(visual_desc);
    }
  });

  return visual.length > 0 ? visual : ['fresh colorful ingredients'];
}

/**
 * Bestimme Plating-Stil basierend auf Rezept-Kategorie und Name
 */
function getPlatingSuggestion(category, name) {
  const nameLower = (name || '').toLowerCase();
  const categoryLower = (category || '').toLowerCase();
  
  if (nameLower.includes('bowl')) {
    return 'arranged beautifully in a white ceramic bowl';
  }
  if (nameLower.includes('stir-fry') || nameLower.includes('wok') || categoryLower.includes('asiatisch')) {
    return 'piled high on a white plate, steam rising';
  }
  if (nameLower.includes('salat') || nameLower.includes('salad')) {
    return 'arranged on a white ceramic plate, vibrant and fresh';
  }
  if (nameLower.includes('suppe') || nameLower.includes('soup') || nameLower.includes('eintopf')) {
    return 'served in a white ceramic bowl, rich and inviting';
  }
  if (nameLower.includes('dessert') || nameLower.includes('pudding') || nameLower.includes('mousse') || nameLower.includes('cake')) {
    return 'elegantly plated on a small white plate with garnish';
  }
  if (nameLower.includes('pancake') || nameLower.includes('waffle') || nameLower.includes('frühstück')) {
    return 'stacked on a white plate, golden brown and fluffy';
  }
  if (nameLower.includes('pizza') || nameLower.includes('brot')) {
    return 'on a rustic wooden board or white plate';
  }
  if (nameLower.includes('smoothie') || nameLower.includes('shake')) {
    return 'in a clear glass, topped with fresh toppings';
  }
  
  return 'on a white plate, appetizing presentation';
}

/**
 * Generiere einen detaillierten Food-Photography-Prompt
 * Basiert auf: Zutaten, Kategorie, Rezept-Name
 */
function buildImprovedPrompt(recipe, ingredients) {
  const visualIngredients = extractVisualIngredients(ingredients);
  const plating = getPlatingSuggestion(recipe.kategorie, recipe.name);
  const dishName = (recipe.name || '')
    .replace(/🥗|🍜|🍴|🌿|🔥|🥘|🍽️|🥙|🍛|🍝|🍲|🌮|🍱|🥙/g, '')
    .trim();
  
  return `Professional editorial food photography of ${dishName}. Visual elements: ${visualIngredients.join(', ')}. Presentation: ${plating}. Photography style: magazine quality, bright natural window lighting from the left side, shallow depth of field with food in sharp focus, background slightly blurred. Setting: rustic wooden table with neutral cream and white linens, minimal props, clean minimalist background. Color grading: warm appetizing tones, high contrast, vibrant natural food colors, rich shadows, bright highlights. Details: no text, no watermarks, no people visible, perfect food styling, professional composition, studio-quality lighting, appetizing presentation.`;
}

/**
 * Fallback: Generischer Prompt (wenn keine Zutaten verfügbar sind)
 */
function buildLegacyPrompt(name) {
  return `Appetizing photorealistic food photo of "${name}", editorial food photography, 3/4 overhead view, natural daylight on warm kitchen table, realistic colors, no text, no watermark, no people`;
}

function buildVersionedImagePath(id, generatedAt) {
  const stamp = generatedAt.toISOString().replace(/[-:.TZ]/g, "");
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${id}/${stamp}-${nonce}.jpg`;
}

async function requireAdmin(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60000,
  });
  const user = await clerk.users.getUser(payload.sub);
  if (user.publicMetadata?.role !== "admin") throw new Error("Forbidden");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  try {
    await requireAdmin(token);
  } catch {
    return res.status(403).json({ error: "Zugriff verweigert – nur für Admins" });
  }

  const { id } = req.body ?? {};
  if (!id) return res.status(400).json({ error: "id fehlt" });

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) return res.status(500).json({ error: "HF_TOKEN fehlt" });
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: "Supabase-Konfiguration fehlt" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // Fetch recipe WITH ingredients for improved prompt
  const { data: recipe, error: dbErr } = await supabase
    .from("recipes")
    .select("id, name, kategorie, image_path, recipe_ingredients(ingredient)")
    .eq("id", id)
    .single();

  if (dbErr || !recipe) return res.status(404).json({ error: "Rezept nicht gefunden" });

  await supabase.from("recipes").update({ image_status: "generating" }).eq("id", id);

  try {
    // Use improved prompt if ingredients are available, fallback to legacy
    const ingredients = recipe.recipe_ingredients || [];
    const prompt = ingredients.length > 0
      ? buildImprovedPrompt(recipe, ingredients)
      : buildLegacyPrompt(recipe.name);

    const hfRes = await fetch(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width: 512, height: 384 },
        }),
        signal: AbortSignal.timeout(90000),
      }
    );

    if (!hfRes.ok) {
      const err = await hfRes.json().catch(() => ({}));
      throw new Error(`HF ${hfRes.status}: ${err.error || hfRes.statusText}`);
    }

    const imgBuffer = Buffer.from(await hfRes.arrayBuffer());
    if (imgBuffer.length < 1000) throw new Error("Bild zu klein – Generierung fehlgeschlagen");

    const generatedAt = new Date();
    const filePath = buildVersionedImagePath(id, generatedAt);
    const previousImagePath = recipe.image_path || null;

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET).upload(filePath, imgBuffer, {
        contentType: "image/jpeg",
        cacheControl: "60",
        upsert: false,
      });

    if (uploadErr) throw new Error(`Storage: ${uploadErr.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    await supabase.from("recipes").update({
      image_status: "ready",
      image_path: filePath,
      image_url: urlData.publicUrl,
      image_generated_at: generatedAt.toISOString(),
    }).eq("id", id);

    if (previousImagePath && previousImagePath !== filePath) {
      await supabase.storage.from(BUCKET).remove([previousImagePath]).catch(() => {});
    }

    return res.status(200).json({ ok: true, image_url: urlData.publicUrl });
  } catch (err) {
    await supabase.from("recipes").update({ image_status: "failed" }).eq("id", id);
    return res.status(500).json({ error: err.message });
  }
}
