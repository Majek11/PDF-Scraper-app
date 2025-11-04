export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { stripe, PLANS, isStripeEnabled } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    if (!isStripeEnabled || !stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      )
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { plan } = await req.json()

    if (!plan || !["BASIC", "PRO"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const planDetails = PLANS[plan as keyof typeof PLANS]
    if (!planDetails?.priceId || !planDetails.priceId.startsWith("price_")) {
      return NextResponse.json(
        { error: "Stripe is not fully configured. Missing price ID." },
        { status: 500 }
      )
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId || undefined,
      customer_email: !user.stripeCustomerId ? user.email : undefined,
      client_reference_id: session.user.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: planDetails.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/settings?canceled=true`,
      metadata: {
        userId: session.user.id,
        plan: plan,
      },
    })

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url })
  } catch (error: any) {
    console.error("Checkout session creation failed:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
