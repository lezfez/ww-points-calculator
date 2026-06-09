import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;
    if (userId) {
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: { isPremium: true, stripeCustomerId: session.customer },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    // Find user by stripeCustomerId stored in publicMetadata
    const users = await clerk.users.getUserList({
      limit: 1,
      query: subscription.customer,
    });
    if (users?.data?.[0]) {
      await clerk.users.updateUserMetadata(users.data[0].id, {
        publicMetadata: { isPremium: false },
      });
    }
  }

  res.json({ received: true });
}
