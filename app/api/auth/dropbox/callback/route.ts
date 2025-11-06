import { NextRequest, NextResponse } from 'next/server'
import { Dropbox, DropboxAuth } from 'dropbox'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/inbox?error=no_code', request.url))
  }

  const dbxAuth = new DropboxAuth({
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
  })

  try {
    const response = await dbxAuth.getAccessTokenFromCode(
      process.env.DROPBOX_REDIRECT_URI!,
      code
    )

    const tokens = response.result as any
    const encodedTokens = encodeURIComponent(JSON.stringify(tokens))
    return NextResponse.redirect(new URL(`/dashboard/inbox?dropbox_tokens=${encodedTokens}`, request.url))
  } catch (error) {
    console.error('Error getting tokens:', error)
    return NextResponse.redirect(new URL('/dashboard/inbox?error=token_error', request.url))
  }
}
