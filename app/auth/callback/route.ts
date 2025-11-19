import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createServerClient()
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Use service role client to create company/user (bypasses RLS)
      const supabaseAdmin = createServiceRoleClient()
      
      // Check if user has company and profile setup
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('company_id, full_name')
        .eq('id', data.user.id)
        .single()

      // If user doesn't have a profile yet (first time OAuth login)
      if (userError || !userData) {
        // Create company first
        const { data: newCompany, error: companyError } = await supabaseAdmin
          .from('companies')
          .insert([{
            name: data.user.user_metadata?.full_name?.split(' ')[0] + "'s Company" || 'My Company',
            subscription_plan_id: 'free',
          }] as any)
          .select('id')
          .single()

        if (!companyError && newCompany) {
          // Create user profile
          await supabaseAdmin
            .from('users')
            .insert([{
              id: data.user.id,
              email: data.user.email!,
              full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
              company_id: (newCompany as any).id,
              role: 'admin',
            }] as any)
        }
      }

      // Redirect to specified next URL or default to dashboard inbox
      const redirectUrl = next || '/dashboard/inbox'
      return NextResponse.redirect(`${origin}${redirectUrl}`)
    }
  }

  // If there's an error or no code, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
