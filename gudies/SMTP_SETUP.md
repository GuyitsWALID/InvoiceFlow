# SMTP Setup Guide for Team Invitations

This guide will help you set up email sending for team invitations in InvoiceFlow.

## Overview

Team invitations require email delivery to notify invited users. You'll need to:
1. Choose an email service provider
2. Configure SMTP credentials
3. Implement email sending in the API
4. Test the invitation flow

## Recommended Email Providers

### 1. Resend (Recommended for Next.js)
- **Website**: https://resend.com
- **Pricing**: Free tier includes 3,000 emails/month
- **Pros**: Simple API, great DX, built for developers
- **Setup Time**: ~5 minutes

### 2. SendGrid
- **Website**: https://sendgrid.com
- **Pricing**: Free tier includes 100 emails/day
- **Pros**: Robust, reliable, good documentation
- **Setup Time**: ~10 minutes

### 3. Postmark
- **Website**: https://postmarkapp.com
- **Pricing**: Free trial, then starts at $15/month
- **Pros**: High deliverability, transactional focused
- **Setup Time**: ~10 minutes

### 4. Amazon SES
- **Website**: https://aws.amazon.com/ses
- **Pricing**: $0.10 per 1,000 emails
- **Pros**: Cheapest for high volume, AWS integration
- **Setup Time**: ~30 minutes (requires domain verification)

## Option 1: Resend Setup (Recommended)

### Step 1: Create Resend Account
1. Go to https://resend.com
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key
1. Go to API Keys section
2. Click "Create API Key"
3. Name it "InvoiceFlow Team Invitations"
4. Copy the API key

### Step 3: Add Environment Variables
Add to your `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
EMAIL_FROM=noreply@yourdomain.com
```

### Step 4: Install Resend Package
```bash
npm install resend
```

### Step 5: Create Email Service
Create `lib/email/service.ts`:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface InvitationEmailData {
  to: string
  invitationUrl: string
  companyName: string
  inviterName: string
  role: string
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  try {
    const { data: result, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'InvoiceFlow <noreply@yourdomain.com>',
      to: data.to,
      subject: `You've been invited to join ${data.companyName} on InvoiceFlow`,
      html: getInvitationEmailHtml(data),
    })

    if (error) {
      console.error('Error sending invitation email:', error)
      throw error
    }

    return result
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    throw error
  }
}

function getInvitationEmailHtml(data: InvitationEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin-top: 0;">You're Invited!</h1>
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${data.inviterName} has invited you to join <strong>${data.companyName}</strong> on InvoiceFlow.
          </p>
          <div style="background-color: white; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Role:</strong> ${data.role}</p>
            <p style="margin: 0;"><strong>Company:</strong> ${data.companyName}</p>
          </div>
          <a href="${data.invitationUrl}" 
             style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 20px 0;">
            Accept Invitation
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <p style="font-size: 14px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="${data.invitationUrl}" style="color: #2563eb; word-break: break-all;">${data.invitationUrl}</a>
          </p>
        </div>
        <div style="text-align: center; font-size: 12px; color: #999; padding: 20px;">
          <p>InvoiceFlow - Automated Invoice Processing</p>
        </div>
      </body>
    </html>
  `
}
```

### Step 6: Update Invitation API
Update `app/api/team/invite/route.ts` around line 120:

```typescript
// Replace this comment:
// TODO: Send invitation email

// With:
import { sendInvitationEmail } from '@/lib/email/service'

// Then in the try block after creating invitation:
await sendInvitationEmail({
  to: email,
  invitationUrl,
  companyName: company.name,
  inviterName: currentUser.full_name || currentUser.email || 'A team member',
  role
})
```

### Step 7: Test Email Sending
1. Start your dev server: `npm run dev`
2. Go to Team page
3. Invite a team member
4. Check your email inbox
5. Click the invitation link to test acceptance flow

## Option 2: SendGrid Setup

### Step 1: Create SendGrid Account
1. Go to https://sendgrid.com
2. Sign up for free account
3. Complete sender verification

### Step 2: Create API Key
1. Go to Settings > API Keys
2. Create API Key with "Mail Send" permission
3. Copy the API key

### Step 3: Add Environment Variables
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Install SendGrid Package
```bash
npm install @sendgrid/mail
```

### Step 5: Create Email Service
Create `lib/email/service.ts`:

```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

interface InvitationEmailData {
  to: string
  invitationUrl: string
  companyName: string
  inviterName: string
  role: string
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  try {
    await sgMail.send({
      to: data.to,
      from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
      subject: `You've been invited to join ${data.companyName} on InvoiceFlow`,
      html: getInvitationEmailHtml(data),
    })
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    throw error
  }
}

// Use same HTML template as Resend example above
function getInvitationEmailHtml(data: InvitationEmailData): string {
  // ... same as above
}
```

## Production Checklist

Before deploying to production:

- [ ] Verify email domain (prevents spam folders)
- [ ] Set up SPF, DKIM, and DMARC records
- [ ] Test emails across different providers (Gmail, Outlook, etc.)
- [ ] Add email rate limiting to prevent abuse
- [ ] Set up monitoring for email delivery failures
- [ ] Create email templates for other notifications
- [ ] Add unsubscribe functionality (for marketing emails)
- [ ] Configure webhook for bounce/complaint handling
- [ ] Update privacy policy to mention email communications
- [ ] Test invitation flow end-to-end

## Troubleshooting

### Emails not sending
1. Check API key is correct in `.env.local`
2. Verify email domain is verified with provider
3. Check server logs for error messages
4. Ensure EMAIL_FROM matches verified sender

### Emails going to spam
1. Verify domain ownership with provider
2. Set up SPF record: `v=spf1 include:_spf.emailprovider.com ~all`
3. Set up DKIM keys (provided by email service)
4. Set up DMARC policy
5. Use a custom domain (not gmail.com, etc.)
6. Avoid spam trigger words in subject/body

### Rate limiting errors
1. Check your plan limits
2. Implement exponential backoff for retries
3. Queue emails for bulk sending
4. Upgrade plan if needed

## Alternative: Development Mode (No SMTP)

For local development without SMTP setup:

1. In `app/api/team/invite/route.ts`, keep the invitation URL logging
2. Copy the URL from server console
3. Open it manually in browser
4. This works until you set up real email sending

## Next Steps

After email is working:
1. Set up welcome emails for new users
2. Add password reset emails
3. Create notification emails for approvals
4. Add email preferences page for users
5. Implement digest emails for activity summaries

## Support

If you need help:
- Check provider documentation
- Review error logs
- Test with simple email first
- Verify DNS records are propagated (can take 24-48 hours)
