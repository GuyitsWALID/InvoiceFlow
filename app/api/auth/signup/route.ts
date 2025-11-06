import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, fullName, companyName } = await request.json()

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createServiceRoleClient()

    // Step 1: Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      )
    }

    // Step 2: Create company (with service role, bypasses RLS)
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{ name: companyName }] as any)
      .select()
      .single()

    if (companyError) {
      // Rollback: delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create company: ' + companyError.message },
        { status: 400 }
      )
    }

    // Step 3: Create user profile (with service role, bypasses RLS)
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          company_id: (companyData as any).id,
          role: 'admin',
        },
      ] as any)

    if (userError) {
      // Rollback: delete company and auth user
      await supabase.from('companies').delete().eq('id', (companyData as any).id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + userError.message },
        { status: 400 }
      )
    }

    // Step 4: Create company settings (with service role, bypasses RLS)
    const { error: settingsError } = await supabase
      .from('company_settings')
      .insert([{ company_id: (companyData as any).id }] as any)

    if (settingsError) {
      console.error('Failed to create company settings:', settingsError)
      // Don't rollback for settings error, it's not critical
    }

    // Return success with session data
    return NextResponse.json(
      { 
        success: true,
        message: 'Account created successfully',
        user: authData.user 
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
