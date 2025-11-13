export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { extractResumeData } from "@/lib/extract-resume"
import { isStripeEnabled, CREDITS_PER_RESUME } from "@/lib/stripe"

// For production: Store files as base64 in database or use a reliable cloud storage
// This eliminates dependency on Supabase Storage configuration issues
function storeFileAsBase64(buffer: Buffer, fileName: string, userId: string): string {
  // In production, this could be:
  // 1. Base64 in DB (for small files)
  // 2. AWS S3 / Google Cloud Storage / Azure Blob
  // 3. Vercel Blob Storage (recommended for Vercel deployments)
  
  // For now, we'll use base64 data URL for reliability
  const base64 = buffer.toString('base64')
  return `data:application/pdf;base64,${base64}`
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user credits ONLY if Stripe is configured
    if (isStripeEnabled) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true, planType: true },
      })

      if (!user || user.credits < CREDITS_PER_RESUME) {
        return NextResponse.json(
          {
            error: "Insufficient credits",
            message: `You need ${CREDITS_PER_RESUME} credits to process a resume. Please upgrade your plan.`,
            currentCredits: user?.credits || 0,
            requiredCredits: CREDITS_PER_RESUME,
          },
          { status: 402 }
        )
      }
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 10MB" }, { status: 400 })
    }

    // Upload to Supabase Storage (expect existing bucket "resumes")
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const filePath = `private/${session.user.id}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Store file (production-ready approach)
    const fileUrl = storeFileAsBase64(buffer, file.name, session.user.id)
    console.log("[UPLOAD] File stored successfully, size:", buffer.length)

    // Deduct credits BEFORE processing (only if Stripe is enabled)
    if (isStripeEnabled) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: CREDITS_PER_RESUME } },
      })
    }

    // Create resume record
    const resume = await prisma.resume.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: fileUrl,
        extractedData: {},
        status: "processing",
      },
    })

    // Start extraction in background
    extractResumeData(resume.id, buffer, file.size).catch((error) => {
      console.error("[EXTRACTION_ERROR]", error)
      prisma.resume.update({
        where: { id: resume.id },
        data: { status: "failed" },
      })
      // Refund credits if extraction fails (only if Stripe is enabled)
      if (isStripeEnabled) {
        prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { increment: CREDITS_PER_RESUME } },
        })
      }
    })

    return NextResponse.json({ resumeId: resume.id }, { status: 200 })
  } catch (error: any) {
    console.error("[UPLOAD_ROUTE_ERROR]", error?.message || error)
    return NextResponse.json({ error: "Internal server error", details: error?.message }, { status: 500 })
  }
}
