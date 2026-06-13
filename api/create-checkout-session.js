import Stripe from "stripe";
import { createClerkClient, verifyToken } from "@clerk/backend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const APP_URL = process.env.APP_URL || "https://ww-points-calculator.vercel.app";

async function getVerifiedUser(token) {
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60000,
  });
  return clerk.users.getUser(payload.sub);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Nicht authentifiziert" });

  let user;
  try {
    user = await getVerifiedUser(token);
  } catch {
    return res.status(401).json({ error: "Ungueltiges Token" });
  }

  const userId = user.id;
  const userEmail = user.primaryEmailAddress?.emailAddress || undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${APP_URL}?premium=success`,
      cancel_url: `${APP_URL}?premium=canceled`,
      client_reference_id: userId,
      ...(userEmail ? { customer_email: userEmail } : {}),
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
