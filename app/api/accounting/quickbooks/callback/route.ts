import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { QuickBooksAdapter } from '@/lib/accounting/adapters/quickbooks'

/**
 * OAuth 2.0 Callback Handler for QuickBooks
 * 
 * User flow:
 * 1. User clicks "Connect QuickBooks" → redirects to QuickBooks login
 * 2. User authorizes → QuickBooks redirects here with code & realmId
 * 3. We exchange code for tokens
 * 4. Save encrypted tokens to database
 * 5. Redirect user back to dashboard
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const realmId = searchParams.get('realmId')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('QuickBooks OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent('QuickBooks connection failed')}`, request.url)
    )
  }

  // Validate required parameters
  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=invalid_callback', request.url)
    )
  }

  try {
    const supabase = await createServerClient()

    // Get current user and company
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!userData) {
      throw new Error('User not found')
    }

    // Create adapter and exchange code for tokens
    const adapter = new QuickBooksAdapter('temp', userData.company_id)
    
    const connectionMetadata = await adapter.connect({
      code: code,
      state: `realmId=${realmId}&original_state=${state}`, // Pass realmId in state
      redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI || `${new URL(request.url).origin}/api/accounting/quickbooks/callback`,
    })

    // TODO: Encrypt tokens before saving (use KMS or crypto library)
    const encryptedAccessToken = connectionMetadata.access_token_encrypted // Already "encrypted" in adapter
    const encryptedRefreshToken = connectionMetadata.refresh_token_encrypted

    // Save connection to database
    const { data: existingConnection } = await supabase
      .from('accounting_connections')
      .select('id')
      .eq('company_id', userData.company_id)
      .eq('provider', 'quickbooks')
      .single()

    if (existingConnection) {
      // Update existing connection
      await supabase
        .from('accounting_connections')
        .update({
          provider_company_id: connectionMetadata.provider_company_id,
          provider_company_name: connectionMetadata.provider_company_name,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: connectionMetadata.token_expires_at?.toISOString(),
          scopes: connectionMetadata.scopes,
          is_active: true,
          is_default: true,
          metadata: connectionMetadata.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id)
    } else {
      // Create new connection
      await supabase
        .from('accounting_connections')
        .insert({
          company_id: userData.company_id,
          provider: 'quickbooks',
          provider_company_id: connectionMetadata.provider_company_id,
          provider_company_name: connectionMetadata.provider_company_name,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: connectionMetadata.token_expires_at?.toISOString(),
          scopes: connectionMetadata.scopes,
          is_active: true,
          is_default: true,
          metadata: connectionMetadata.metadata,
        })
    }

    // Mark onboarding as completed
    await supabase
      .from('companies')
      .update({ onboarding_completed: true })
      .eq('id', userData.company_id)

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard/settings?success=quickbooks_connected', request.url)
    )

  } catch (error) {
    console.error('QuickBooks callback error:', error)
    
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?error=${encodeURIComponent('Failed to connect QuickBooks')}`,
        request.url
      )
    )
  }
}
