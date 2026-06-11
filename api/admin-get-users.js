import { createClerkClient, verifyToken } from "@clerk/backend";

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
  if (req.method !== "GET") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  try {
    await requireAdmin(token);
  } catch {
    return res.status(403).json({ error: "Zugriff verweigert – nur für Admins" });
  }

  const { query } = req.query;

  const response = await clerk.users.getUserList({
    limit: 25,
    query: query || undefined,
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

  res.json({ users });
}
