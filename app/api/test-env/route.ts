import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Check which environment variables are set
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    HUGGINGFACE_API_KEY: !!process.env.HUGGINGFACE_API_KEY,
    GOOGLE_GEMINI_API_KEY: !!process.env.GOOGLE_GEMINI_API_KEY,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
  }

  return NextResponse.json({
    message: 'Environment variables check',
    variables: envCheck,
    timestamp: new Date().toISOString()
  })
}
