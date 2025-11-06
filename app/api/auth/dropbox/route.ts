import { NextResponse } from 'next/server'

export async function GET() {
  const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${process.env.DROPBOX_APP_KEY}&redirect_uri=${process.env.DROPBOX_REDIRECT_URI}&response_type=code&token_access_type=offline`

  return NextResponse.redirect(authUrl)
}
