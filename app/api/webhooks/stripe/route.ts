export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { stripe, PLANS, isStripeEnabled } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  if (!isStripeEnabled || !stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    )
  }

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
  console.log(`📋 Event ID: ${event.id}`)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`💳 Checkout session: ${session.id}, mode: ${session.mode}, customer: ${session.customer}, client_ref: ${session.client_reference_id}`)
        console.log(`📦 Metadata:`, session.metadata)
        if (session.mode === "subscription") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          console.log(`🔄 Retrieved subscription: ${subscription.id}, status: ${subscription.status}`)
          const planFromMetadata = (session.metadata?.plan as "BASIC" | "PRO" | undefined) || undefined
          console.log(`📌 Plan from metadata: ${planFromMetadata}`)
          await handleSubscriptionCreated(
            session.client_reference_id!,
            session.customer as string,
            subscription,
            planFromMetadata
          )
        }
        break
      }
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription
        // Try to infer user via client_reference_id stored as metadata on subscription (if added later) else by matching customer in DB
        const userByCustomer = await prisma.user.findFirst({ where: { stripeCustomerId: subscription.customer as string } })
        if (userByCustomer) {
          await handleSubscriptionCreated(
            userByCustomer.id,
            subscription.customer as string,
            subscription,
            undefined
          )
        } else {
          console.warn(`Subscription created but user not found for customer ${subscription.customer}`)
        }
        break
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const subId = (invoice as any).subscription as string | null | undefined
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId)
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
  subscription: Stripe.Subscription,
  planOverride?: "BASIC" | "PRO"
) {
  console.log(`🎯 handleSubscriptionCreated called: userId=${userId}, customerId=${customerId}, subId=${subscription.id}`)
  
  const priceId = subscription.items.data[0].price.id
  console.log(`💰 Price ID from subscription: ${priceId}`)
  console.log(`📋 Available PLANS:`, Object.entries(PLANS).map(([k, v]) => `${k}: ${v.priceId}`))
  
  const plan = planOverride || (Object.entries(PLANS).find(([_, p]) => p.priceId === priceId)?.[0] as "BASIC" | "PRO" | undefined)
  
  if (!plan) {
    console.error(`❌ Unknown price ID: ${priceId} (no planOverride). Cannot assign credits.`)
    console.error(`   Looked for: ${priceId}`)
    console.error(`   Available: BASIC=${PLANS.BASIC.priceId}, PRO=${PLANS.PRO.priceId}`)
    return
  }
  
  const creditsToAdd = PLANS[plan].credits
  const periodEnd = (subscription as any).current_period_end as number | undefined
  
  console.log(`📊 Will add ${creditsToAdd} credits for ${plan} plan to user ${userId}`)
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripePriceId: priceId,
      planType: plan,
      credits: { increment: creditsToAdd },
      stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  })
  
  console.log(`✅ Subscription created for user ${userId}: ${plan} plan, ${creditsToAdd} credits added`)
  console.log(`📈 User now has ${updatedUser.credits} total credits`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await prisma.user.findUnique({ where: { stripeSubscriptionId: subscription.id } })
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
  const periodEnd = (subscription as any).current_period_end as number | undefined
  if (user.stripePriceId !== priceId) {
    const credits = PLANS[plan].credits
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripePriceId: priceId,
        planType: plan,
        credits: { increment: credits },
        stripeSubscriptionStatus: subscription.status,
        stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    })
    console.log(`✅ Subscription updated for user ${user.id}: ${plan} plan, ${credits} credits added`)
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionStatus: subscription.status,
        stripeCurrentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
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
