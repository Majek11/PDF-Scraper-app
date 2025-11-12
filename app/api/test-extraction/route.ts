import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Extraction API is ready",
    env: {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    },
  })
}
