'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Crown,
  AlertCircle,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'accountant' | 'approver' | 'viewer'
  created_at: string
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  invited_by: string
  expires_at: string
  created_at: string
  inviter?: {
    full_name?: string
    email: string
  }
}

interface SubscriptionPlan {
  id: string
  display_name: string
  max_team_members: number
  features: any
}

interface Company {
  id: string
  name: string
  subscription_plan_id: string
  subscription_plan?: SubscriptionPlan
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  accountant: 'Accountant',
  approver: 'Approver',
  viewer: 'Viewer'
}

const roleDescriptions: Record<string, string> = {
  admin: 'Full access to all features, can manage team and settings',
  accountant: 'Can process and sync invoices, manage vendors',
  approver: 'Can approve or reject invoices',
  viewer: 'Read-only access to invoices and reports'
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  accountant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approver: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('viewer')
  const [inviting, setInviting] = useState(false)
  
  // Remove member dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadTeamData()
  }, [])

  const loadTeamData = async () => {
    setLoading(true)
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Please sign in')
      return
    }

    // Get current user
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!userData) {
      toast.error('Failed to load user data')
      return
    }

    setCurrentUser(userData)

    // Get company with subscription plan
    const { data: companyData } = await supabase
      .from('companies')
      .select(`
        *,
        subscription_plan:subscription_plans(*)
      `)
      .eq('id', userData.company_id)
      .single()

    if (companyData) {
      setCompany(companyData as any)
    }

    // Get team members
    const { data: membersData, error: membersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('Error loading team members:', membersError)
    } else {
      setMembers(membersData as any)
    }

    // Get pending invitations
    const { data: invitationsData } = await supabase
      .from('team_invitations')
      .select(`
        *,
        inviter:invited_by(full_name, email)
      `)
      .eq('company_id', userData.company_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (invitationsData) {
      setInvitations(invitationsData as any)
    }

    setLoading(false)
  }

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteRole) {
      toast.error('Please fill in all fields')
      return
    }

    if (!company || !currentUser) {
      toast.error('Company data not loaded')
      return
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      toast.error('Only admins can invite team members')
      return
    }

    // Check team size limit
    const maxMembers = company.subscription_plan?.max_team_members || 1
    const currentSize = members.length + invitations.length
    
    if (currentSize >= maxMembers) {
      toast.error(
        `Team limit reached! Your ${company.subscription_plan?.display_name} plan allows ${maxMembers} member${maxMembers > 1 ? 's' : ''}. Please upgrade to add more members.`,
        { duration: 5000 }
      )
      return
    }

    // Check if email already exists
    const existingMember = members.find(m => m.email.toLowerCase() === inviteEmail.toLowerCase())
    if (existingMember) {
      toast.error('This email is already a team member')
      return
    }

    const existingInvitation = invitations.find(i => i.email.toLowerCase() === inviteEmail.toLowerCase())
    if (existingInvitation) {
      toast.error('An invitation has already been sent to this email')
      return
    }

    setInviting(true)

    try {
      // Call invitation API
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          company_id: company.id
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(`Invitation sent to ${inviteEmail}`)
        setInviteDialogOpen(false)
        setInviteEmail('')
        setInviteRole('viewer')
        await loadTeamData()
      } else {
        toast.error(result.error || 'Failed to send invitation')
      }
    } catch (error) {
      toast.error('Failed to send invitation')
      console.error('Invite error:', error)
    }

    setInviting(false)
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const toastId = toast.loading('Canceling invitation...')

    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      toast.error('Failed to cancel invitation', { id: toastId })
    } else {
      toast.success('Invitation canceled', { id: toastId })
      await loadTeamData()
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove || !currentUser) return

    if (currentUser.role !== 'admin') {
      toast.error('Only admins can remove team members')
      return
    }

    if (memberToRemove.id === currentUser.id) {
      toast.error('You cannot remove yourself from the team')
      return
    }

    const toastId = toast.loading('Removing team member...')

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', memberToRemove.id)

    if (error) {
      toast.error('Failed to remove team member', { id: toastId })
    } else {
      toast.success('Team member removed', { id: toastId })
      setRemoveDialogOpen(false)
      setMemberToRemove(null)
      await loadTeamData()
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Only admins can change roles')
      return
    }

    if (memberId === currentUser.id) {
      toast.error('You cannot change your own role')
      return
    }

    const toastId = toast.loading('Updating role...')

    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      toast.error('Failed to update role', { id: toastId })
    } else {
      toast.success('Role updated successfully', { id: toastId })
      await loadTeamData()
    }
  }

  const confirmRemoveMember = (member: TeamMember) => {
    setMemberToRemove(member)
    setRemoveDialogOpen(true)
  }

  const maxMembers = company?.subscription_plan?.max_team_members || 1
  const currentSize = members.length
  const pendingSize = invitations.length
  const totalSize = currentSize + pendingSize
  const canAddMore = totalSize < maxMembers
  const isAdmin = currentUser?.role === 'admin'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Users className="h-8 w-8 mr-3" />
                Team Management
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Invite and manage your team members
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Team Size
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalSize} / {maxMembers}
                </p>
                <Badge variant={canAddMore ? 'default' : 'destructive'} className="mt-1">
                  {company?.subscription_plan?.display_name || 'Free'} Plan
                </Badge>
              </div>
              {isAdmin && canAddMore && (
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              )}
            </div>
          </div>

          {!canAddMore && isAdmin && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Team limit reached
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You've reached the maximum number of team members for your {company?.subscription_plan?.display_name} plan.
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                className="mt-3"
                onClick={() => window.location.href = '/dashboard/plans'}
              >
                View Upgrade Options
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Members Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Team Members ({currentSize})
              </h2>
            </div>

            {members.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  No team members yet
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Invite team members to collaborate on invoices
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const isCurrentUser = member.id === currentUser?.id
                  
                  return (
                    <Card key={member.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                            {member.full_name?.[0] || member.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {member.full_name || 'No name'}
                              </p>
                              {isCurrentUser && (
                                <Badge variant="outline">You</Badge>
                              )}
                              {member.role === 'admin' && (
                                <Crown className="h-4 w-4 text-yellow-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {member.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Joined {formatDate(member.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {isAdmin && !isCurrentUser ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleUpdateRole(member.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <span className="flex items-center">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Admin
                                  </span>
                                </SelectItem>
                                <SelectItem value="accountant">Accountant</SelectItem>
                                <SelectItem value="approver">Approver</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={roleColors[member.role]}>
                              {roleLabels[member.role]}
                            </Badge>
                          )}

                          {isAdmin && !isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmRemoveMember(member)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Pending Invitations ({pendingSize})
                </h2>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <Card key={invitation.id} className="p-4 border-dashed">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {invitation.email}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Invited by {invitation.inviter?.full_name || invitation.inviter?.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Expires {formatDate(invitation.expires_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <Badge className={roleColors[invitation.role]}>
                            {roleLabels[invitation.role]}
                          </Badge>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Roles Info Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Team Roles
              </h3>
              <div className="space-y-4">
                {Object.entries(roleLabels).map(([role, label]) => (
                  <div key={role}>
                    <div className="flex items-center space-x-2 mb-1">
                      {role === 'admin' && <Crown className="h-4 w-4 text-yellow-600" />}
                      {role === 'accountant' && <Shield className="h-4 w-4 text-blue-600" />}
                      {role === 'approver' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {role === 'viewer' && <Users className="h-4 w-4 text-gray-600" />}
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {label}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {roleDescriptions[role]}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Subscription Info
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Plan</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {company?.subscription_plan?.display_name || 'Free'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Team Members</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {totalSize} / {maxMembers}
                  </p>
                </div>
                {!canAddMore && (
                  <Button className="w-full mt-4" variant="default">
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new member to your team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div>
                      <p className="font-medium">Admin</p>
                      <p className="text-xs text-gray-500">Full access and team management</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="accountant">
                    <div>
                      <p className="font-medium">Accountant</p>
                      <p className="text-xs text-gray-500">Process invoices and manage vendors</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="approver">
                    <div>
                      <p className="font-medium">Approver</p>
                      <p className="text-xs text-gray-500">Approve or reject invoices</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div>
                      <p className="font-medium">Viewer</p>
                      <p className="text-xs text-gray-500">Read-only access</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> The invitation will be sent via email and will expire in 7 days.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
              disabled={inviting}
            >
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.email}</strong> from your team? 
              They will immediately lose access to all company data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
