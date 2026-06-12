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

function getMondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function mealCoins(meals) {
  if (!meals) return 0;
  return Object.values(meals).flat().reduce((s, i) => s + (Number(i?.coins) || 0), 0);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  let userId;
  try { userId = await getUserId(token); }
  catch { return res.status(401).json({ error: "Ungültiges Token" }); }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const reqDate = req.query.date || new Date().toISOString().slice(0, 10);
  const monday = getMondayOf(reqDate);
  const sunday = addDays(monday, 6);

  // Fetch this week + last 60 days for streak
  const sixtyDaysAgo = addDays(new Date().toISOString().slice(0, 10), -60);

  const [profileRes, weekRes, historyRes] = await Promise.all([
    supabase.from("user_profiles").select("daily_budget, weekly_bonus").eq("user_id", userId).single(),
    supabase.from("daily_journal").select("date, meals, earned_coins, used_bonus_coins").eq("user_id", userId).gte("date", monday).lte("date", sunday),
    supabase.from("daily_journal").select("date, meals, earned_coins, used_bonus_coins").eq("user_id", userId).gte("date", sixtyDaysAgo).order("date", { ascending: false }),
  ]);

  const dailyBudget = profileRes.data?.daily_budget || 35;
  const entriesByDate = Object.fromEntries((weekRes.data || []).map(e => [e.date, e]));

  // Build 7-day array
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const entry = entriesByDate[date];
    const totalCoins = entry ? mealCoins(entry.meals) : 0;
    const earnedCoins = entry?.earned_coins || 0;
    const usedBonus = entry?.used_bonus_coins || 0;
    const available = dailyBudget + earnedCoins + usedBonus;
    return {
      date,
      totalCoins,
      earnedCoins,
      usedBonus,
      available,
      has_data: !!entry,
      budget_met: !!entry && totalCoins <= available,
    };
  });

  // Streak: count consecutive budget_met days going back from yesterday
  const today = new Date().toISOString().slice(0, 10);
  const histByDate = Object.fromEntries((historyRes.data || []).map(e => [e.date, e]));
  let streak = 0;
  let checkDate = addDays(today, -1);
  for (let i = 0; i < 60; i++) {
    const e = histByDate[checkDate];
    if (!e) break;
    const tc = mealCoins(e.meals);
    const av = dailyBudget + (e.earned_coins || 0) + (e.used_bonus_coins || 0);
    if (tc > av) break;
    streak++;
    checkDate = addDays(checkDate, -1);
  }

  res.json({ week, streak, dailyBudget });
}
