import { createClerkClient, verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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

  const { id, required_role, enabled } = req.body;
  if (!id) return res.status(400).json({ error: "id fehlt" });

  const validRoles = ["guest", "user", "premium", "admin"];
  if (required_role && !validRoles.includes(required_role)) {
    return res.status(400).json({ error: "Ungültige Rolle" });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const updates = { updated_at: new Date().toISOString() };
  if (required_role !== undefined) updates.required_role = required_role;
  if (enabled !== undefined) updates.enabled = enabled;

  const { error } = await supabase
    .from("feature_flags")
    .update(updates)
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
}
