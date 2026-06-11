import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function requireAdmin(token) {
  const payload = await clerk.verifyToken(token);
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

  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: "userId und role sind erforderlich" });

  const validRoles = ["user", "premium", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Ungültige Rolle. Erlaubt: ${validRoles.join(", ")}` });
  }

  const targetUser = await clerk.users.getUser(userId);

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...targetUser.publicMetadata,
      role,
      isPremium: role === "premium" || role === "admin",
    },
  });

  res.json({ success: true });
}
