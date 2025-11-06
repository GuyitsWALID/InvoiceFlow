import { Dropbox } from 'dropbox'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { tokens } = await request.json()

  const dbx = new Dropbox({ accessToken: tokens.access_token })

  try {
    // Search for PDF and image files
    const response = await dbx.filesSearch({
      path: '',
      query: '*.pdf OR *.jpg OR *.jpeg OR *.png',
      max_results: 100,
    })

    // Filter and format results
    const files = response.result.matches
      .filter((match: any) => match.metadata['.tag'] === 'file')
      .map((match: any) => ({
        id: match.metadata.id,
        name: match.metadata.name,
        path_display: match.metadata.path_display,
        size: match.metadata.size,
        client_modified: match.metadata.client_modified,
      }))

    return NextResponse.json(files)
  } catch (error) {
    console.error('Error listing Dropbox files:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}
