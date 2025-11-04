export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { extractResumeData } from "@/lib/extract-resume"
import { createClient } from "@supabase/supabase-js"
import { isStripeEnabled, CREDITS_PER_RESUME } from "@/lib/stripe"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase admin env vars are missing")
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
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

    let uploadPath: string | undefined
    try {
      const supabaseAdmin = getSupabaseAdmin()
      console.log("[UPLOAD] Attempting upload to Supabase Storage bucket: resumes")
      console.log("[UPLOAD] File path:", filePath, "Size:", buffer.length)
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("resumes")
        .upload(filePath, buffer, {
          contentType: "application/pdf",
          upsert: false,
        })

      if (uploadError) {
        console.error("[UPLOAD_ERROR]", uploadError)
        console.error("[UPLOAD_ERROR] Message:", uploadError?.message)
        console.error("[UPLOAD_ERROR] Status:", uploadError?.statusCode)
        return NextResponse.json({ 
          error: "Failed to upload file", 
          details: uploadError?.message || JSON.stringify(uploadError)
        }, { status: 500 })
      }
      
      console.log("[UPLOAD] Success! Path:", uploadData?.path)
      uploadPath = uploadData!.path
    } catch (e: any) {
      console.error("[SUPABASE_ERROR]", e)
      console.error("[SUPABASE_ERROR] Stack:", e?.stack)
      return NextResponse.json({ 
        error: "Storage request failed", 
        details: e?.message || e?.cause?.message || String(e)
      }, { status: 500 })
    }

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
        fileUrl: uploadPath!,
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
