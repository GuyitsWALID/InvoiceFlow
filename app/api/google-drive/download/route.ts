import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { tokens, fileId } = await request.json()

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials(tokens)

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    return new NextResponse(response.data as ArrayBuffer)
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}