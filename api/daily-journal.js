import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMPTY_MEALS = { fruehstueck: [], snack1: [], mittag: [], abend: [], snack2: [] };
const EMPTY_WELLNESS = { gemuese: 0, oel: 0, getraenke: 0, bewusste_mahlzeit: false };

async function getUserId(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60000,
  });
  return payload.sub;
}

function getMondayOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun,1=Mon,...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (!["GET", "PUT"].includes(req.method)) return res.status(405).end();

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

  if (req.method === "GET") {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const monday = getMondayOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const sundayStr = sunday.toISOString().slice(0, 10);

    const [journalRes, weekRes] = await Promise.all([
      supabase.from("daily_journal").select("*").eq("user_id", userId).eq("date", date).single(),
      supabase.from("daily_journal").select("used_bonus_coins").eq("user_id", userId).gte("date", monday).lte("date", sundayStr),
    ]);

    const entry = journalRes.data || {
      user_id: userId, date,
      meals: EMPTY_MEALS,
      earned_coins: 0, used_bonus_coins: 0,
      wellness: EMPTY_WELLNESS,
    };

    const weeklyUsed = (weekRes.data || []).reduce((sum, r) => sum + (r.used_bonus_coins || 0), 0);

    return res.json({ entry, weeklyUsed });
  }

  // PUT – upsert journal entry
  const { date, meals, earned_coins, used_bonus_coins, wellness } = req.body ?? {};
  if (!date) return res.status(400).json({ error: "date fehlt" });

  const updates = {
    user_id: userId,
    date,
    updated_at: new Date().toISOString(),
  };
  if (meals !== undefined) updates.meals = meals;
  if (earned_coins !== undefined) updates.earned_coins = Math.max(0, parseInt(earned_coins) || 0);
  if (used_bonus_coins !== undefined) updates.used_bonus_coins = Math.max(0, parseInt(used_bonus_coins) || 0);
  if (wellness !== undefined) updates.wellness = wellness;

  const { data, error } = await supabase
    .from("daily_journal")
    .upsert(updates, { onConflict: "user_id,date" })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ entry: data });
}
