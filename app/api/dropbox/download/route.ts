import { Dropbox } from 'dropbox'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { tokens, path } = await request.json()

  const dbx = new Dropbox({ accessToken: tokens.access_token })

  try {
    const response = await dbx.filesDownload({ path })

    // @ts-ignore - fileBlob exists on response
    const fileBlob = response.result.fileBlob
    const buffer = await fileBlob.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fileBlob.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${response.result.name}"`,
      },
    })
  } catch (error) {
    console.error('Error downloading Dropbox file:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
