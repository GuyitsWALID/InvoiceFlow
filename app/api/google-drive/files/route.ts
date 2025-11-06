import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { tokens } = await request.json()

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials(tokens)

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  try {
    // List PDF and image files
    const response = await drive.files.list({
      q: "mimeType='application/pdf' or mimeType='image/jpeg' or mimeType='image/png'",
      fields: 'files(id, name, mimeType, size, thumbnailLink)',
      pageSize: 100,
    })

    return NextResponse.json(response.data.files)
  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}