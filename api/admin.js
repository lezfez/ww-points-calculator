import { createClerkClient, verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getVerifiedUser(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60000,
  });
  return clerk.users.getUser(payload.sub);
}

async function requireAdmin(token) {
  const user = await getVerifiedUser(token);
  if (user.publicMetadata?.role !== "admin") throw new Error("Forbidden");
  return user;
}

function auditAdminAction(action, actor, details) {
  try {
    console.info("[admin-audit]", {
      action,
      actorId: actor?.id || null,
      actorEmail: actor?.emailAddresses?.[0]?.emailAddress || null,
      timestamp: new Date().toISOString(),
      details,
    });
  } catch {
    // Optional audit logging must never break admin actions.
  }
}

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  const action = req.query.action;

  // ── bootstrap: no admin role required, but email must be in whitelist ──
  if (action === "bootstrap") {
    if (req.method !== "POST") return res.status(405).end();
    let user;
    try { user = await getVerifiedUser(token); }
    catch (e) { return res.status(401).json({ error: "Ungültiger Token", detail: e?.message }); }

    const email = user.emailAddresses[0]?.emailAddress?.toLowerCase() || "";
    const allowed = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(email)) return res.status(403).json({ error: `${email} ist nicht in der Admin-Whitelist.` });

    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: { ...user.publicMetadata, role: "admin" },
    });
    return res.json({ success: true, message: `${email} wurde als Admin eingerichtet.` });
  }

  // ── all other actions require admin role ─────────────────
  let adminUser;
  try { adminUser = await requireAdmin(token); }
  catch { return res.status(403).json({ error: "Nur für Admins" }); }

  // ── users: list / search users ──────────────────────────
  if (action === "users") {
    if (req.method !== "GET") return res.status(405).end();
    const response = await clerk.users.getUserList({
      limit: 25,
      query: req.query.query || undefined,
      orderBy: "-created_at",
    });
    const users = (response.data || []).map(u => ({
      id: u.id,
      email: u.emailAddresses?.[0]?.emailAddress || "",
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      role: u.publicMetadata?.role || "user",
      isPremium: u.publicMetadata?.isPremium === true,
      createdAt: u.createdAt,
    }));
    return res.json({ users, total: response.totalCount });
  }

  // ── set-flag: update feature flag ───────────────────────
  if (action === "set-flag") {
    if (req.method !== "POST") return res.status(405).end();
    const { id, required_role, enabled } = req.body ?? {};
    if (!id) return res.status(400).json({ error: "id fehlt" });

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });
    const updates = { updated_at: new Date().toISOString() };
    if (required_role !== undefined) updates.required_role = required_role;
    if (enabled !== undefined) updates.enabled = enabled;

    const { error } = await supabase.from("feature_flags").update(updates).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });

    auditAdminAction("set-flag", adminUser, {
      flagId: id,
      required_role: updates.required_role,
      enabled: updates.enabled,
    });

    return res.json({ success: true });
  }

  // ── set-role: update user role ───────────────────────────
  if (action === "set-role") {
    if (req.method !== "POST") return res.status(405).end();
    const { userId, role } = req.body ?? {};
    if (!userId || !role) return res.status(400).json({ error: "userId und role erforderlich" });

    const validRoles = ["user", "premium", "admin"];
    if (!validRoles.includes(role)) return res.status(400).json({ error: `Ungültige Rolle` });

    const target = await clerk.users.getUser(userId);
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { ...target.publicMetadata, role, isPremium: role === "premium" || role === "admin" },
    });

    auditAdminAction("set-role", adminUser, {
      targetUserId: userId,
      targetUserEmail: target.emailAddresses?.[0]?.emailAddress || null,
      role,
    });

    return res.json({ success: true });
  }

  return res.status(400).json({ error: "Unbekannte action" });
}
