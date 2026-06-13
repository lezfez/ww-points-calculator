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

async function findUserByStripeRefs({ customerId, subscriptionId }) {
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const page = await clerk.users.getUserList({
      limit: pageSize,
      offset,
      orderBy: "-created_at",
    });

    const users = page?.data || [];
    const found = users.find(u => {
      const meta = u.publicMetadata || {};
      return (
        (customerId && meta.stripeCustomerId === customerId) ||
        (subscriptionId && meta.stripeSubscriptionId === subscriptionId)
      );
    });
    if (found) return found;

    if (users.length < pageSize) break;
    offset += pageSize;
  }

  return null;
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
      const existing = await clerk.users.getUser(userId);
      const existingRole = existing.publicMetadata?.role;
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...existing.publicMetadata,
          isPremium: true,
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: session.subscription || null,
          role: existingRole === "admin" ? "admin" : "premium",
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const user = await findUserByStripeRefs({
      customerId: subscription.customer || null,
      subscriptionId: subscription.id || null,
    });
    if (user) {
      const existingRole = user.publicMetadata?.role;
      await clerk.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          isPremium: false,
          stripeSubscriptionId: null,
          role: existingRole === "admin" ? "admin" : "user",
        },
      });
    }
  }

  res.json({ received: true });
}
