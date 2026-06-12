import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getUserId(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60000,
  });
  return payload.sub;
}

function calcCoins({ kcal, gesF, zucker, protein, bst, salz }) {
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  const raw = (kcal || 0) * 0.022
    + (gesF || 0) * 0.20
    + (zucker || 0) * 0.10
    + (salz || 0) * 0.15
    - clamp(protein || 0, 0, 50) * 0.10
    - clamp(bst || 0, 0, 10) * 0.15;
  return Math.max(0, Math.round(raw));
}

function mapOFFProduct(p) {
  const n = p.nutriments || {};
  const kcal     = n["energy-kcal_100g"] ?? n["energy_100g"] / 4.184 ?? null;
  const protein  = n["proteins_100g"] ?? null;
  const carbs    = n["carbohydrates_100g"] ?? null;
  const sugar    = n["sugars_100g"] ?? null;
  const fat      = n["fat_100g"] ?? null;
  const sat_fat  = n["saturated-fat_100g"] ?? null;
  const fiber    = n["fiber_100g"] ?? null;
  const salt     = n["salt_100g"] ?? null;

  const coins_100g = calcCoins({ kcal, gesF: sat_fat, zucker: sugar, protein, bst: fiber, salz: salt });

  const serving_g = p.serving_quantity ? parseFloat(p.serving_quantity) : null;

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
    serving_g,
    serving_label: p.serving_size || null,
    source: "openfoodfacts",
    off_id: p.id || p.code || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  try { await getUserId(token); }
  catch { return res.status(401).json({ error: "Ungültiges Token" }); }

  const q = (req.query.q || "").trim();
  if (!q || q.length < 2) return res.json({ foods: [] });

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Search cache
  const { data: cached } = await supabase
    .from("foods")
    .select("*")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(20);

  if (cached && cached.length >= 5) {
    return res.json({ foods: cached, source: "cache" });
  }

  // 2. Query Open Food Facts (global + AT parallel)
  try {
    const OFF_FIELDS = "id,code,product_name,product_name_de,product_name_en,brands,nutriments,serving_size,serving_quantity";
    const offUrls = [
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&lc=de&fields=${OFF_FIELDS}`,
      `https://at.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&lc=de&fields=${OFF_FIELDS}`,
    ];
    const offResults = await Promise.allSettled(
      offUrls.map(url => fetch(url, { headers: { "User-Agent": "WW-Points-Calculator/1.0" } }).then(r => r.json()))
    );

    const seen = new Map();
    for (const result of offResults) {
      if (result.status !== "fulfilled") continue;
      const prods = (result.value.products || [])
        .filter(p => p.product_name_de || p.product_name || p.product_name_en)
        .map(mapOFFProduct)
        .filter(p => p.kcal_100g != null);
      for (const p of prods) {
        const key = p.off_id || `${p.name}__${p.brand}`;
        if (!seen.has(key)) seen.set(key, p);
      }
    }
    const products = [...seen.values()];

    // Upsert into cache (ignore conflicts)
    if (products.length > 0) {
      await supabase.from("foods").upsert(
        products.filter(p => p.off_id),
        { onConflict: "off_id", ignoreDuplicates: false }
      );
    }

    // Merge with cached results (deduplicate by off_id)
    const offIds = new Set(products.map(p => p.off_id).filter(Boolean));
    const merged = [
      ...(cached || []).filter(c => !offIds.has(c.off_id)),
      ...products,
    ].slice(0, 20);

    return res.json({ foods: merged, source: "openfoodfacts" });
  } catch {
    return res.json({ foods: cached || [], source: "cache" });
  }
}
