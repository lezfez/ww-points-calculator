import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const APP_URL = process.env.APP_URL || "https://ww-points-calculator.vercel.app";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, userEmail } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${APP_URL}?premium=success`,
      cancel_url: `${APP_URL}?premium=canceled`,
      client_reference_id: userId,
      customer_email: userEmail,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
