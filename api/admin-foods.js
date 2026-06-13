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

function calcCoins({ kcal, gesF, zucker, protein, bst, salz }) {
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  const raw = (kcal || 0) * 0.022 + (gesF || 0) * 0.20 + (zucker || 0) * 0.10
    + (salz || 0) * 0.15 - clamp(protein || 0, 0, 50) * 0.10 - clamp(bst || 0, 0, 10) * 0.15;
  return Math.max(0, Math.round(raw));
}

const BASE_URL = "https://world.openfoodfacts.org";
const OFF_FIELDS = "id,code,product_name,product_name_de,product_name_en,brands,nutriments,serving_size,serving_quantity";

// Two searches via world.openfoodfacts.org: global + AT country-filter (avoids the unreliable at.openfoodfacts.org domain)
const OFF_SOURCES = [
  { key: "world", params: "",                                                                        label: "🌍 Global" },
  { key: "at",    params: "&tagtype_0=countries&tag_contains_0=contains&tag_0=en:austria",           label: "🇦🇹 AT" },
];

function mapOFFProduct(p, sourceLabel) {
  const n = p.nutriments || {};
  const kcal    = n["energy-kcal_100g"] ?? null;
  const protein = n["proteins_100g"] ?? null;
  const carbs   = n["carbohydrates_100g"] ?? null;
  const sugar   = n["sugars_100g"] ?? null;
  const fat     = n["fat_100g"] ?? null;
  const sat_fat = n["saturated-fat_100g"] ?? null;
  const fiber   = n["fiber_100g"] ?? null;
  const salt    = n["salt_100g"] ?? null;
  const coins_100g = calcCoins({ kcal, gesF: sat_fat, zucker: sugar, protein, bst: fiber, salz: salt });
  return {
    name: (p.product_name_de || p.product_name || p.product_name_en || "Unbekannt").trim(),
    brand: p.brands?.split(",")[0]?.trim() || null,
    barcode: p.code || null,
    kcal_100g: kcal != null ? Math.round(kcal * 10) / 10 : null,
    protein_100g: protein != null ? Math.round(protein * 10) / 10 : null,
    carbs_100g: carbs != null ? Math.round(carbs * 10) / 10 : null,
    sugar_100g: sugar != null ? Math.round(sugar * 10) / 10 : null,
    fat_100g: fat != null ? Math.round(fat * 10) / 10 : null,
    sat_fat_100g: sat_fat != null ? Math.round(sat_fat * 10) / 10 : null,
    fiber_100g: fiber != null ? Math.round(fiber * 10) / 10 : null,
    salt_100g: salt != null ? Math.round(salt * 10) / 10 : null,
    coins_100g,
    serving_g: p.serving_quantity ? parseFloat(p.serving_quantity) : null,
    serving_label: p.serving_size || null,
    source: "openfoodfacts",
    off_id: p.id || p.code || null,
    _sourceLabel: sourceLabel,
  };
}

async function searchOFF(q, { params, label }) {
  const endpoint = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&lc=de&fields=${OFF_FIELDS}${params}`;
  const res = await fetch(endpoint, { headers: { "User-Agent": "WW-Points-Calculator-Admin/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.products || [])
    .filter(p => p.product_name_de || p.product_name || p.product_name_en)
    .map(p => mapOFFProduct(p, label))
    .filter(p => p.kcal_100g != null);
}

function mergeAndDedup(arrays) {
  const seen = new Map();
  for (const products of arrays) {
    for (const p of products) {
      const key = p.off_id || `${p.name}__${p.brand}`;
      if (!seen.has(key)) seen.set(key, p);
      // AT preferred over world for same product
      else if (p._sourceLabel?.includes("AT")) seen.set(key, p);
    }
  }
  return [...seen.values()];
}

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });
  try { await requireAdmin(token); }
  catch { return res.status(403).json({ error: "Nur für Admins" }); }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

  // ── GET: list local foods or search OFF ──────────────────
  if (req.method === "GET") {
    const { q = "", page = "1", off } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = 25;

    if (req.query._stats === "1") {
      const [{ count: total, error: totalError }, { count: offCount, error: offError }, { count: manualCount, error: manualError }, { count: incompleteCount, error: incompleteError }] = await Promise.all([
        supabase.from("foods").select("id", { count: "exact", head: true }),
        supabase.from("foods").select("id", { count: "exact", head: true }).eq("source", "openfoodfacts"),
        supabase.from("foods").select("id", { count: "exact", head: true }).eq("source", "manual"),
        supabase.from("foods").select("id", { count: "exact", head: true }).is("kcal_100g", null),
      ]);

      const error = totalError || offError || manualError || incompleteError;
      if (error) return res.status(500).json({ error: error.message });

      return res.json({
        total: total || 0,
        off: offCount || 0,
        manual: manualCount || 0,
        incomplete: incompleteCount || 0,
      });
    }

    if (off === "1") {
      if (!q || q.length < 2) return res.json({ products: [] });
      try {
        const results = await Promise.allSettled(OFF_SOURCES.map(src => searchOFF(q, src)));
        const arrays = results.map(r => r.status === "fulfilled" ? r.value : []);
        const products = mergeAndDedup(arrays);
        return res.json({ products });
      } catch {
        return res.json({ products: [] });
      }
    }

    // Local DB search
    let query = supabase.from("foods").select("*", { count: "exact" }).order("name");
    if (q) query = query.ilike("name", `%${q}%`);
    query = query.range((pageNum - 1) * pageSize, pageNum * pageSize - 1);
    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ foods: data || [], total: count || 0, page: pageNum, pageSize });
  }

  // ── POST: create manual food or bulk import from OFF ─────
  if (req.method === "POST") {
    const body = req.body ?? {};

    if (body.import && Array.isArray(body.foods)) {
      // Bulk import from OFF — strip UI-only fields before DB insert
      const toInsert = body.foods.filter(f => f.off_id).map(({ _sourceLabel, ...rest }) => rest);
      if (toInsert.length === 0) return res.json({ imported: 0 });
      const { data, error } = await supabase
        .from("foods")
        .upsert(toInsert, { onConflict: "off_id", ignoreDuplicates: false })
        .select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ imported: data?.length || 0 });
    }

    // Manual single food
    const { name, brand, kcal_100g, protein_100g, carbs_100g, sugar_100g, fat_100g, sat_fat_100g, fiber_100g, salt_100g, serving_g, serving_label } = body;
    if (!name) return res.status(400).json({ error: "name fehlt" });
    const coins_100g = calcCoins({ kcal: kcal_100g, gesF: sat_fat_100g, zucker: sugar_100g, protein: protein_100g, bst: fiber_100g, salz: salt_100g });
    const { data, error } = await supabase.from("foods").insert({
      name, brand: brand || null, kcal_100g, protein_100g, carbs_100g, sugar_100g,
      fat_100g, sat_fat_100g, fiber_100g, salt_100g, coins_100g,
      serving_g: serving_g || null, serving_label: serving_label || null, source: "manual",
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // ── PUT: update food ────────────────────────────────────
  if (req.method === "PUT") {
    const id = parseInt(req.query.id);
    if (!id) return res.status(400).json({ error: "id fehlt" });
    const body = req.body ?? {};
    const coins_100g = calcCoins({ kcal: body.kcal_100g, gesF: body.sat_fat_100g, zucker: body.sugar_100g, protein: body.protein_100g, bst: body.fiber_100g, salz: body.salt_100g });
    const { data, error } = await supabase.from("foods")
      .update({ ...body, coins_100g })
      .eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // ── DELETE ───────────────────────────────────────────────
  if (req.method === "DELETE") {
    const id = parseInt(req.query.id);
    if (!id) return res.status(400).json({ error: "id fehlt" });
    const { error } = await supabase.from("foods").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: true });
  }

  return res.status(405).end();
}
