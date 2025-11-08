'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, Building2, Mail, Shield } from 'lucide-react'

interface InvitationData {
  email: string
  role: string
  company: {
    name: string
  }
  invited_by: {
    full_name: string
    email: string
  }
  expires_at: string
}

export default function AcceptInvitationPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    try {
      const supabase = createClient()

      // Fetch invitation details
      const { data, error: fetchError } = await supabase
        .from('team_invitations')
        .select(`
          email,
          role,
          expires_at,
          accepted_at,
          company_id,
          invited_by
        `)
        .eq('token', token)
        .is('accepted_at', null)
        .maybeSingle()

      if (fetchError || !data) {
        setError('Invalid or expired invitation link')
        setLoading(false)
        return
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
        setLoading(false)
        return
      }

      // Fetch company details
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', data.company_id)
        .single()

      // Fetch inviter details
      const { data: inviterData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', data.invited_by)
        .single()

      const invitationData: InvitationData = {
        email: data.email,
        role: data.role,
        expires_at: data.expires_at,
        company: companyData || { name: 'Unknown Company' },
        invited_by: inviterData || { full_name: '', email: 'Unknown User' }
      }

      setInvitation(invitationData)
      setLoading(false)
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation')
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    try {
      setAccepting(true)
      setError(null)

      const supabase = createClient()

      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Redirect to sign up with email pre-filled
        router.push(`/auth/signup?email=${encodeURIComponent(invitation!.email)}&token=${token}`)
        return
      }

      // If user is logged in, check if email matches
      if (session.user.email?.toLowerCase() !== invitation!.email.toLowerCase()) {
        setError('Please sign in with the email address that received this invitation')
        setAccepting(false)
        return
      }

      // Accept the invitation using the database function
      const { data, error: acceptError } = await supabase.rpc('accept_invitation', {
        invitation_token: token
      })

      if (acceptError) {
        console.error('Error accepting invitation:', acceptError)
        setError('Failed to accept invitation. Please try again.')
        setAccepting(false)
        return
      }

      setSuccess(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError('An unexpected error occurred')
      setAccepting(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800'
      case 'accountant':
        return 'bg-blue-100 text-blue-800'
      case 'approver':
        return 'bg-green-100 text-green-800'
      case 'viewer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
              variant="outline"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-center">Welcome to the Team!</CardTitle>
            <CardDescription className="text-center">
              You've successfully joined {invitation?.company.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Redirecting to dashboard...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-center">You're Invited!</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join a team on InvoiceFlow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium">{invitation?.company.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{invitation?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation!.role)}`}>
                  {invitation?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Invited By */}
          <div className="text-center text-sm text-gray-600">
            Invited by {invitation?.invited_by.full_name || invitation?.invited_by.email}
          </div>

          {/* Expiration Notice */}
          <div className="text-center text-xs text-gray-500">
            This invitation expires on{' '}
            {new Date(invitation!.expires_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Accept Button */}
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full"
            size="lg"
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            By accepting, you'll gain access to {invitation?.company.name}'s InvoiceFlow workspace
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
