import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PLANS } from "@/lib/stripe"

export async function POST(req: Request) {
  try {
    const { userId, plan } = await req.json()

    if (!userId || !plan || !["BASIC", "PRO"].includes(plan)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, planType: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const creditsToAdd = PLANS[plan as "BASIC" | "PRO"].credits
    
    console.log(`[TEST] Before update: credits=${user.credits}, plan=${user.planType}`)

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: creditsToAdd },
        planType: plan,
        stripePriceId: PLANS[plan as "BASIC" | "PRO"].priceId,
      },
    })

    console.log(`[TEST] After update: credits=${updatedUser.credits}, plan=${updatedUser.planType}`)

    return NextResponse.json({
      message: "Credits updated successfully",
      before: { credits: user.credits, plan: user.planType },
      after: { credits: updatedUser.credits, plan: updatedUser.planType },
      added: creditsToAdd,
    })
  } catch (error) {
    console.error("[TEST_CREDIT_UPDATE_ERROR]", error)
    return NextResponse.json({ error: "Failed to update credits" }, { status: 500 })
  }
}
