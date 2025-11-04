export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { stripe, PLANS } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get("stripe-signature")!

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("Stripe webhook secret is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  console.log(`🔔 Received event: ${event.type}`)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === "subscription") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          
          await handleSubscriptionCreated(
            session.client_reference_id!,
            session.customer as string,
            subscription
          )
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          await handleSubscriptionUpdated(subscription)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0].price.id
  const plan = Object.entries(PLANS).find(([_, p]) => p.priceId === priceId)?.[0] as "BASIC" | "PRO"

  if (!plan) {
    console.error(`Unknown price ID: ${priceId}`)
    return
  }

  const credits = PLANS[plan].credits

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripePriceId: priceId,
      planType: plan,
      credits: { increment: credits },
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  })

  console.log(`✅ Subscription created for user ${userId}: ${plan} plan, ${credits} credits added`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!user) {
    console.error(`User not found for subscription: ${subscription.id}`)
    return
  }

  const priceId = subscription.items.data[0].price.id
  const plan = Object.entries(PLANS).find(([_, p]) => p.priceId === priceId)?.[0] as "BASIC" | "PRO"

  if (!plan) {
    console.error(`Unknown price ID: ${priceId}`)
    return
  }

  // If plan changed, add the difference in credits
  if (user.stripePriceId !== priceId) {
    const credits = PLANS[plan].credits
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripePriceId: priceId,
        planType: plan,
        credits: { increment: credits },
        stripeSubscriptionStatus: subscription.status,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    })

    console.log(`✅ Subscription updated for user ${user.id}: ${plan} plan, ${credits} credits added`)
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionStatus: subscription.status,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    })

    console.log(`✅ Subscription status updated for user ${user.id}`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!user) {
    console.error(`User not found for subscription: ${subscription.id}`)
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      planType: "FREE",
      stripeSubscriptionStatus: "canceled",
    },
  })

  console.log(`✅ Subscription canceled for user ${user.id}`)
}
