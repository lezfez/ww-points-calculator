import { createClerkClient, verifyToken } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  let userId;
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 60000,
    });
    userId = payload.sub;
  } catch (e) {
    return res.status(401).json({ error: "Ungültiger Session-Token", detail: e?.message });
  }

  const user = await clerk.users.getUser(userId);
  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase() || "";

  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allowed.includes(email)) {
    return res.status(403).json({ error: `${email} ist nicht in der Admin-Whitelist (ADMIN_EMAILS).` });
  }

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { ...user.publicMetadata, role: "admin" },
  });

  res.json({ success: true, message: `${email} wurde als Admin eingerichtet.` });
}
