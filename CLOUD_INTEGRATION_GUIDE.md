# Cloud Storage Integration Guide

This guide will help you implement working Google Drive, Dropbox, and OneDrive integrations for InvoiceFlow.

## Overview

Each cloud storage provider requires:
1. **API Keys/Credentials** - Register your app with the provider
2. **OAuth 2.0 Flow** - Allow users to authorize access to their files
3. **API Client** - Use their SDK/API to access files
4. **File Selection** - Let users browse and select invoices
5. **Download & Upload** - Download from cloud, upload to Supabase

---

## 1. Google Drive Integration

### Step 1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google Drive API**:
   - Go to "APIs & Services" → "Library"
   - Search "Google Drive API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/google/callback
   https://yourdomain.com/api/auth/google/callback
   ```
5. Save **Client ID** and **Client Secret**

### Step 3: Add Environment Variables

Add to your `.env.local`:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Step 4: Install Google API Client

```bash
npm install googleapis
```

### Step 5: Create OAuth Flow API Route

Create `app/api/auth/google/route.ts`:
```typescript
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly'
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  })

  return NextResponse.redirect(authUrl)
}
```

### Step 6: Create Callback Handler

Create `app/api/auth/google/callback/route.ts`:
```typescript
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/dashboard/inbox?error=no_code')
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  try {
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Store tokens in session or database
    // For now, redirect to file picker
    const encodedTokens = encodeURIComponent(JSON.stringify(tokens))
    return NextResponse.redirect(`/dashboard/inbox?google_tokens=${encodedTokens}`)
  } catch (error) {
    console.error('Error getting tokens:', error)
    return NextResponse.redirect('/dashboard/inbox?error=token_error')
  }
}
```

### Step 7: Create File Picker API

Create `app/api/google-drive/files/route.ts`:
```typescript
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { tokens } = await request.json()

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials(tokens)

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  try {
    // List PDF and image files
    const response = await drive.files.list({
      q: "mimeType='application/pdf' or mimeType='image/jpeg' or mimeType='image/png'",
      fields: 'files(id, name, mimeType, size, thumbnailLink)',
      pageSize: 100,
    })

    return NextResponse.json(response.data.files)
  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}
```

### Step 8: Create File Download API

Create `app/api/google-drive/download/route.ts`:
```typescript
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { tokens, fileId } = await request.json()

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials(tokens)

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    return new NextResponse(response.data as ArrayBuffer)
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
```

### Step 9: Update Upload Dialog Component

Replace the `handleGoogleDrive` function in `upload-invoice-dialog.tsx`:
```typescript
const handleGoogleDrive = () => {
  // Redirect to Google OAuth
  window.location.href = '/api/auth/google'
}
```

---

## 2. Dropbox Integration

### Step 1: Create Dropbox App

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose "Scoped access"
4. Choose "Full Dropbox" access
5. Name your app
6. Create app

### Step 2: Configure App

1. Go to "Settings" tab
2. Add redirect URIs:
   ```
   http://localhost:3000/api/auth/dropbox/callback
   https://yourdomain.com/api/auth/dropbox/callback
   ```
3. Copy **App key** and **App secret**

### Step 3: Add Environment Variables

```env
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here
DROPBOX_REDIRECT_URI=http://localhost:3000/api/auth/dropbox/callback
```

### Step 4: Install Dropbox SDK

```bash
npm install dropbox
```

### Step 5: Create OAuth Flow

Create `app/api/auth/dropbox/route.ts`:
```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${process.env.DROPBOX_APP_KEY}&redirect_uri=${process.env.DROPBOX_REDIRECT_URI}&response_type=code&token_access_type=offline`

  return NextResponse.redirect(authUrl)
}
```

### Step 6: Create Callback Handler

Create `app/api/auth/dropbox/callback/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Dropbox } from 'dropbox'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/dashboard/inbox?error=no_code')
  }

  const dbx = new Dropbox({
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
  })

  try {
    const response = await dbx.auth.getAccessTokenFromCode(
      process.env.DROPBOX_REDIRECT_URI!,
      code
    )

    const tokens = response.result as any
    const encodedTokens = encodeURIComponent(JSON.stringify(tokens))
    return NextResponse.redirect(`/dashboard/inbox?dropbox_tokens=${encodedTokens}`)
  } catch (error) {
    console.error('Error getting tokens:', error)
    return NextResponse.redirect('/dashboard/inbox?error=token_error')
  }
}
```

### Step 7: Update Upload Dialog

```typescript
const handleDropbox = () => {
  window.location.href = '/api/auth/dropbox'
}
```

---

## 3. OneDrive Integration

### Step 1: Register App in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name: "InvoiceFlow"
5. Redirect URI: `http://localhost:3000/api/auth/onedrive/callback`
6. Register

### Step 2: Configure Permissions

1. Go to "API permissions"
2. Add permission → Microsoft Graph → Delegated
3. Add: `Files.Read`, `Files.Read.All`, `offline_access`
4. Grant admin consent

### Step 3: Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Copy the value (shown only once!)

### Step 4: Add Environment Variables

```env
ONEDRIVE_CLIENT_ID=your_client_id_here
ONEDRIVE_CLIENT_SECRET=your_client_secret_here
ONEDRIVE_REDIRECT_URI=http://localhost:3000/api/auth/onedrive/callback
```

### Step 5: Install Microsoft Graph SDK

```bash
npm install @microsoft/microsoft-graph-client isomorphic-fetch
```

### Step 6: Create OAuth Flow

Create `app/api/auth/onedrive/route.ts`:
```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.ONEDRIVE_CLIENT_ID}&response_type=code&redirect_uri=${process.env.ONEDRIVE_REDIRECT_URI}&response_mode=query&scope=Files.Read offline_access`

  return NextResponse.redirect(authUrl)
}
```

### Step 7: Create Callback Handler

Create `app/api/auth/onedrive/callback/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect('/dashboard/inbox?error=no_code')
  }

  try {
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.ONEDRIVE_CLIENT_ID!,
        client_secret: process.env.ONEDRIVE_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.ONEDRIVE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()
    const encodedTokens = encodeURIComponent(JSON.stringify(tokens))
    return NextResponse.redirect(`/dashboard/inbox?onedrive_tokens=${encodedTokens}`)
  } catch (error) {
    console.error('Error getting tokens:', error)
    return NextResponse.redirect('/dashboard/inbox?error=token_error')
  }
}
```

### Step 8: Update Upload Dialog

```typescript
const handleOneDrive = () => {
  window.location.href = '/api/auth/onedrive'
}
```

---

## Next Steps

### 1. Create File Picker UI Components

You'll need to create components to:
- Display files from each cloud storage
- Allow users to select multiple files
- Show thumbnails/previews
- Handle pagination

### 2. Handle Token Storage

Store OAuth tokens securely:
- Option 1: Session storage (temporary)
- Option 2: Database (for persistent access)
- Option 3: Encrypted cookies

### 3. Implement File Transfer

After user selects files:
1. Download from cloud storage
2. Convert to File/Blob objects
3. Upload to Supabase Storage
4. Create invoice records

### 4. Add Error Handling

Handle common errors:
- Token expiration
- Network failures
- File size limits
- Unsupported file types
- Rate limiting

### 5. Test Each Integration

Test scenarios:
- First-time authorization
- File selection and upload
- Token refresh
- Error cases
- Revoked access

---

## Recommended Order of Implementation

1. **Start with Google Drive** (most common, good documentation)
2. **Then Dropbox** (similar OAuth flow, simpler API)
3. **Finally OneDrive** (more complex, Microsoft Graph API)

## Security Best Practices

1. Never expose client secrets in frontend code
2. Use HTTPS in production
3. Validate redirect URIs
4. Implement CSRF protection
5. Encrypt stored tokens
6. Set appropriate token expiration
7. Implement proper error handling
8. Log security events

## Estimated Implementation Time

- Google Drive: 4-6 hours
- Dropbox: 3-4 hours
- OneDrive: 4-6 hours
- File picker UI: 3-4 hours
- Testing & polish: 2-3 hours

**Total: ~20-25 hours for complete implementation**

---

## Alternative: Use Third-Party Services

If you want faster implementation, consider:

1. **Filepicker.io** - Multi-cloud file picker as a service
2. **Kloudless** - Unified API for cloud storage
3. **CloudRail** - Single API for multiple clouds

These services handle OAuth, file picking, and downloading for you, but have monthly fees.

---

Need help with any specific integration? Let me know which one you'd like to implement first!
