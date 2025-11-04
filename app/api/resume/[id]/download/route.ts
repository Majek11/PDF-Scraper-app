export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createClient } from "@supabase/supabase-js"

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const resume = await prisma.resume.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 })
    }

    // Generate signed URL (valid for 1 hour)
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const { data, error } = await supabaseAdmin.storage.from("resumes").createSignedUrl(resume.fileUrl, 3600)
      if (error || !data) {
        console.error("[SIGNED_URL_ERROR]", error)
        return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 })
      }
      return NextResponse.json({ url: data.signedUrl })
    } catch (e) {
      console.error("[SUPABASE_INIT_ERROR]", e)
      return NextResponse.json({ error: "Storage is not configured" }, { status: 500 })
    }
  } catch (error) {
    console.error("[DOWNLOAD_ERROR]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
