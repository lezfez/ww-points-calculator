import { createClerkClient, verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function requireAdmin(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60000,
  });
  const user = await clerk.users.getUser(payload.sub);
  if (user.publicMetadata?.role !== "admin") throw new Error("Forbidden");
}

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  try {
    await requireAdmin(token);
  } catch {
    return res.status(403).json({ error: "Nur fuer Admins" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  if (req.method === "GET") {
    const action = req.query.action;
    if (action !== "categories") return res.status(400).json({ error: "Unbekannte action" });

    const { data, error } = await supabase
      .from("recipe_categories")
      .select("slug, label, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (error) {
      if (error.code === "42P01") {
        return res.status(500).json({ error: "Tabelle recipe_categories fehlt. Bitte SQL-Migration ausfuehren." });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json({ categories: data || [] });
  }

  if (req.method === "PUT") {
    const { recipeId, kategorien } = req.body ?? {};
    const parsedId = Number.parseInt(recipeId, 10);
    if (!parsedId) return res.status(400).json({ error: "recipeId fehlt" });
    if (!Array.isArray(kategorien)) return res.status(400).json({ error: "kategorien muss ein Array sein" });

    const normalized = [...new Set(kategorien.map(normalizeSlug).filter(Boolean))];

    const { data: validCats, error: validErr } = await supabase
      .from("recipe_categories")
      .select("slug, label")
      .eq("is_active", true)
      .in("slug", normalized.length ? normalized : ["__none__"]);

    if (validErr) {
      if (validErr.code === "42P01") {
        return res.status(500).json({ error: "Tabelle recipe_categories fehlt. Bitte SQL-Migration ausfuehren." });
      }
      return res.status(500).json({ error: validErr.message });
    }

    if (normalized.length !== (validCats || []).length) {
      const validSet = new Set((validCats || []).map(c => c.slug));
      const unknown = normalized.filter(s => !validSet.has(s));
      return res.status(400).json({ error: `Unbekannte oder inaktive Kategorien: ${unknown.join(", ")}` });
    }

    const labelsBySlug = new Map((validCats || []).map(c => [c.slug, c.label]));
    const legacyText = normalized.map(s => labelsBySlug.get(s) || s).join(", ");

    const { data, error } = await supabase
      .from("recipes")
      .update({
        kategorien: normalized,
        kategorie: legacyText || null,
      })
      .eq("id", parsedId)
      .select("id, kategorie, kategorien")
      .single();

    if (error) {
      if (error.code === "42703") {
        return res.status(500).json({ error: "Spalte recipes.kategorien fehlt. Bitte SQL-Migration ausfuehren." });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, recipe: data });
  }

  return res.status(405).end();
}
