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

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  let userId;
  try {
    userId = await getUserId(token);
  } catch {
    return res.status(401).json({ error: "Ungültiges Token" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // --- Favorites sub-resource ---
  if (req.query.action === "favorites") {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("food_favorites")
        .select("id, name, coins")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data ?? []);
    }

    if (req.method === "POST") {
      const { name, coins } = req.body ?? {};
      if (!name || coins === undefined) return res.status(400).json({ error: "name und coins erforderlich" });
      const { data, error } = await supabase
        .from("food_favorites")
        .upsert({ user_id: userId, name: String(name).slice(0, 200), coins: parseInt(coins) || 0 }, { onConflict: "user_id,name,coins" })
        .select("id, name, coins")
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    if (req.method === "DELETE") {
      const { id } = req.body ?? {};
      if (!id) return res.status(400).json({ error: "id erforderlich" });
      const { error } = await supabase
        .from("food_favorites")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    return res.status(405).end();
  }

  // --- Profile resource ---
  if (!["GET", "PUT"].includes(req.method)) return res.status(405).end();

  if (req.method === "GET") {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    return res.json(data || { user_id: userId, daily_budget: 35, weekly_bonus: 49 });
  }

  // PUT – upsert profile
  const { daily_budget, weekly_bonus, gewicht, groesse, alter_j, geschlecht, aktivitaet, display_name, avatar_url } = req.body ?? {};
  const updates = { user_id: userId, updated_at: new Date().toISOString() };
  if (daily_budget   !== undefined) updates.daily_budget  = Math.max(1, parseInt(daily_budget) || 35);
  if (weekly_bonus   !== undefined) updates.weekly_bonus  = Math.max(0, parseInt(weekly_bonus) || 49);
  if (gewicht        !== undefined) updates.gewicht       = gewicht ? parseFloat(gewicht) : null;
  if (groesse        !== undefined) updates.groesse       = groesse ? parseFloat(groesse) : null;
  if (alter_j        !== undefined) updates.alter_j       = alter_j ? parseInt(alter_j) : null;
  if (geschlecht     !== undefined) updates.geschlecht    = geschlecht || null;
  if (aktivitaet     !== undefined) updates.aktivitaet   = aktivitaet || null;
  if (display_name   !== undefined) updates.display_name  = display_name || null;
  if (avatar_url     !== undefined) updates.avatar_url    = avatar_url || null;

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(updates, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
}
