import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { QuickBooksAdapter } from '@/lib/accounting/adapters/quickbooks'
import { randomBytes } from 'crypto'

/**
 * Initiate QuickBooks OAuth 2.0 Flow
 * 
 * This endpoint starts the OAuth flow by:
 * 1. Generating a random state for CSRF protection
 * 2. Building the authorization URL
 * 3. Redirecting the user to QuickBooks login
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company ID
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate CSRF state token
    const state = randomBytes(32).toString('hex')
    
    // TODO: Store state in session or database with expiration for validation
    // For now, we'll validate in callback that it exists

    // Get redirect URI
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 
                       `${new URL(request.url).origin}/api/accounting/quickbooks/callback`

    // Build authorization URL
    const authUrl = QuickBooksAdapter.getAuthorizationUrl(state, redirectUri)

    // Redirect to QuickBooks OAuth
    return NextResponse.redirect(authUrl)

  } catch (error) {
    console.error('QuickBooks connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks connection' },
      { status: 500 }
    )
  }
}
