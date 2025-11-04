import Stripe from "stripe"

export const isStripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_your_key_here")

// Initialize Stripe client only when a key is provided to avoid crashing optional flows
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // If apiVersion is omitted, the SDK uses your Stripe account's default version
  typescript: true,
})

export const PLANS = {
  BASIC: {
    name: "Basic",
    credits: 10000,
    price: 1000, // $10.00 in cents
    priceId: process.env.STRIPE_PRICE_BASIC!,
  },
  PRO: {
    name: "Pro",
    credits: 20000,
    price: 2000, // $20.00 in cents
    priceId: process.env.STRIPE_PRICE_PRO!,
  },
} as const

export const CREDITS_PER_RESUME = 100
