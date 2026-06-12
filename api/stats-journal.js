import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

async function getUserId(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60000,
  });
  return payload.sub;
}

function mealCoins(meals) {
  if (!meals) return 0;
  return Object.values(meals).flat().reduce((s, i) => s + (Number(i?.coins) || 0), 0);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  let userId;
  try { userId = await getUserId(token); }
  catch { return res.status(401).json({ error: "Ungültiges Token" }); }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const today = new Date().toISOString().slice(0, 10);
  const from = addDays(today, -60);

  const [profileRes, histRes] = await Promise.all([
    supabase.from("user_profiles").select("daily_budget").eq("user_id", userId).single(),
    supabase.from("daily_journal")
      .select("date, meals, earned_coins, used_bonus_coins, activity_blocks, recovery_blocks")
      .eq("user_id", userId)
      .gte("date", from)
      .lte("date", today)
      .order("date", { ascending: true }),
  ]);

  const dailyBudget = profileRes.data?.daily_budget || 35;

  const days = (histRes.data || []).map(e => {
    const totalCoins = mealCoins(e.meals);
    const earnedCoins = e.earned_coins || 0;
    const usedBonus = e.used_bonus_coins || 0;
    const available = dailyBudget + earnedCoins + usedBonus;
    return { date: e.date, totalCoins, earnedCoins, usedBonus, available, budget_met: totalCoins <= available };
  });

  // Best streak over all history
  let bestStreak = 0, tempStreak = 0;
  for (const d of days) {
    if (d.date >= today) continue;
    if (d.budget_met) { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); }
    else tempStreak = 0;
  }

  // Current streak backward from yesterday
  let currentStreak = 0;
  const yesterday = addDays(today, -1);
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].date > yesterday) continue;
    if (!days[i].budget_met) break;
    currentStreak++;
  }

  const pastDays = days.filter(d => d.date < today);
  const budgetMetCount = pastDays.filter(d => d.budget_met).length;
  const avgCoins = pastDays.length > 0
    ? Math.round(pastDays.reduce((s, d) => s + d.totalCoins, 0) / pastDays.length)
    : 0;

  res.json({
    days,
    stats: {
      dailyBudget,
      avgCoins,
      budgetMetRate: pastDays.length > 0 ? Math.round((budgetMetCount / pastDays.length) * 100) : 0,
      currentStreak,
      bestStreak,
      totalDays: pastDays.length,
    },
  });
}
