import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/inbox?error=no_code', request.url))
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Store tokens in session or database
    // For now, redirect to file picker with tokens in URL (temporary - should use session/db in production)
    const encodedTokens = encodeURIComponent(JSON.stringify(tokens))
    return NextResponse.redirect(new URL(`/dashboard/inbox?google_tokens=${encodedTokens}`, request.url))
  } catch (error) {
    console.error('Error getting tokens:', error)
    return NextResponse.redirect(new URL('/dashboard/inbox?error=token_error', request.url))
  }
}
