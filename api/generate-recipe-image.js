import { createClerkClient, verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "recipe-images";
const HF_MODEL = "black-forest-labs/FLUX.1-schnell";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function buildPrompt(name) {
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

  const { data: recipe, error: dbErr } = await supabase
    .from("recipes").select("id, name, image_path").eq("id", id).single();

  if (dbErr || !recipe) return res.status(404).json({ error: "Rezept nicht gefunden" });

  await supabase.from("recipes").update({ image_status: "generating" }).eq("id", id);

  try {
    const hfRes = await fetch(
      `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: buildPrompt(recipe.name),
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
