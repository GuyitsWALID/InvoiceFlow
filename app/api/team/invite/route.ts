import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, role, company_id } = body

    if (!email || !role || !company_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Verify current user is authenticated and is admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', session.user.id)
      .single()

    if (!currentUser || currentUser.company_id !== company_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can invite team members' },
        { status: 403 }
      )
    }

    // Check if email already exists as a user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('company_id', company_id)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this company' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('company_id', company_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Check team size limits
    const { data: company } = await supabase
      .from('companies')
      .select(`
        *,
        subscription_plan:subscription_plans(max_team_members)
      `)
      .eq('id', company_id)
      .single()

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Count current team members + pending invitations
    const { count: memberCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)

    const { count: invitationCount } = await supabase
      .from('team_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())

    const totalSize = (memberCount || 0) + (invitationCount || 0)
    const maxMembers = (company as any).subscription_plan?.max_team_members || 1

    if (totalSize >= maxMembers) {
      return NextResponse.json(
        { error: `Team limit reached. Your plan allows ${maxMembers} member${maxMembers > 1 ? 's' : ''}.` },
        { status: 400 }
      )
    }

    // Generate unique invitation token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        company_id,
        email: email.toLowerCase(),
        role,
        invited_by: session.user.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // TODO: Send invitation email
    // For now, we'll just return the invitation link
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`
    
    console.log('📧 Invitation created:', {
      email,
      role,
      token,
      url: invitationUrl
    })

    // In production, you would send an email here using a service like SendGrid, Resend, etc.
    // Example:
    // await sendInvitationEmail({
    //   to: email,
    //   invitationUrl,
    //   companyName: company.name,
    //   inviterName: currentUser.full_name || currentUser.email
    // })

    return NextResponse.json({
      success: true,
      invitation,
      invitation_url: invitationUrl, // Return URL for testing
      message: 'Invitation created successfully'
    })
  } catch (error) {
    console.error('Team invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
