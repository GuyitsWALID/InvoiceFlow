# Post-Authentication Upload Flow Fix

## Problem
When users uploaded a file on the landing page, they were prompted to sign in (which is good for security). However, after signing in, the application:
1. Didn't recognize the user as authenticated on the homepage (still showing "Sign In" buttons)
2. Lost track of the uploaded file
3. Required users to upload their file again

## Solution
Implemented a complete authentication-aware flow with a dedicated upload page that:
1. Detects authenticated users on the landing page
2. Shows appropriate navigation ("Go to Dashboard" vs "Sign In")
3. Preserves uploaded files through authentication
4. Automatically processes files on a dedicated upload page after sign-in

## Changes Made

### 1. Landing Page (`app/page.tsx`)
**Authentication Detection:**
- Added `useEffect` to check authentication status on mount
- Added `onAuthStateChange` listener to update UI when auth state changes
- Shows "Go to Dashboard" button for authenticated users
- Shows "Sign In" and "Start for Free" buttons for unauthenticated users

**File Handling:**
- When authenticated users upload a file, they're redirected directly to `/upload` page
- When unauthenticated users upload a file, the auth modal appears
- File data (including content as base64) is stored in sessionStorage
- Complete file information preserved: name, type, size, and data

### 2. New Upload Page (`app/upload/page.tsx`)
**Created a dedicated page for handling file uploads:**
- Automatically checks authentication (redirects to login if not authenticated)
- Retrieves pending file from sessionStorage
- Shows real-time upload progress with visual feedback
- Handles complete upload workflow:
  - Validates user profile
  - Checks subscription limits
  - Uploads to Supabase Storage
  - Creates invoice record
  - Triggers OCR processing
  - Redirects to invoice details page
- Provides error handling with retry options
- Cleans up sessionStorage after processing

### 3. Login Page (`app/login/page.tsx`)
- Checks for pending file after successful authentication
- Redirects to `/upload` if file is pending
- Redirects to `/dashboard/inbox` for normal login
- Updated Google OAuth to include proper redirect path based on pending file

### 4. Signup Page (`app/signup/page.tsx`)
- Checks for pending file after successful account creation and sign-in
- Redirects to `/upload` if file is pending
- Redirects to `/dashboard/inbox` for normal signup
- Updated Google OAuth to include proper redirect path based on pending file

### 5. Upload Dialog (`components/upload-invoice-dialog.tsx`)
- Removed the auto-upload logic (now handled by dedicated upload page)
- Kept the existing upload dialog for dashboard use
- Maintained Google Drive and Dropbox integration

### 6. Auth Callback (`app/auth/callback/route.ts`)
- Updated to respect `next` query parameter for custom redirect URLs
- Defaults to `/dashboard/inbox` for OAuth flows
- Supports redirecting to `/upload` page when file is pending

### 7. Middleware (`middleware.ts`)
- Added `/upload` route to protected routes (requires authentication)
- Ensures consistent redirect behavior for authenticated/unauthenticated users

## How It Works

### For Unauthenticated Users:
1. **User uploads file on landing page**
   - File is stored in sessionStorage with all its data (base64 encoded)
   - Auth modal appears prompting sign in or sign up

2. **User signs in or signs up**
   - Authentication completes successfully
   - System checks if there's a pending file in sessionStorage
   - If yes, redirects to `/upload` page
   - If no, redirects to `/dashboard/inbox`

3. **Upload page processes the file**
   - Retrieves file data from sessionStorage
   - Shows progress with real-time updates
   - Uploads to Supabase Storage
   - Creates invoice record
   - Triggers OCR processing
   - Redirects to invoice details page
   - Cleans up sessionStorage

### For Authenticated Users:
1. **User uploads file on landing page**
   - Homepage recognizes user is authenticated (shows "Go to Dashboard")
   - File is stored in sessionStorage
   - User is immediately redirected to `/upload` page

2. **Upload page processes the file**
   - Same workflow as above
   - No authentication check needed (already authenticated)

## Benefits

- **Seamless UX**: Users don't need to re-upload their file after authentication
- **Authentication Awareness**: Homepage updates to reflect authentication state
- **Clear Navigation**: Authenticated users see "Go to Dashboard" instead of "Sign In"
- **Dedicated Upload Flow**: Separate page for upload process with progress feedback
- **Security**: Maintains the security gate of requiring authentication before processing
- **Automatic**: No manual intervention needed - the flow continues automatically
- **Data Preservation**: File is fully preserved through the authentication flow
- **Visual Feedback**: Users see progress during upload with percentage and status updates
- **Error Handling**: Clear error messages with retry options
- **Consistent Redirects**: All authentication paths now properly handle pending files

## Technical Notes

- Uses sessionStorage (not localStorage) so data is cleared when browser tab closes
- Base64 encoding allows storing file content in sessionStorage
- File size limit of 10MB per file is enforced
- Works with both email/password and OAuth (Google) authentication
- Handles both new signups and existing user logins
- Upload page automatically redirects to invoice details after successful upload
- Authentication state is checked on page mount and updated via auth state listener
- Middleware protects the `/upload` route requiring authentication

## Testing Checklist

- [x] Unauthenticated user uploads file → Auth modal appears → Signs in → Redirected to upload page → File uploads → Redirected to invoice
- [x] Unauthenticated user uploads file → Auth modal appears → Signs up → Redirected to upload page → File uploads → Redirected to invoice
- [x] Unauthenticated user uploads file → Signs in with Google → Redirected to upload page → File uploads → Redirected to invoice
- [x] Authenticated user uploads file → Immediately redirected to upload page → File uploads → Redirected to invoice
- [x] Authenticated user visits landing page → Sees "Go to Dashboard" button instead of "Sign In"
- [x] Normal login without pending file → Goes to inbox normally
- [x] Normal signup without pending file → Goes to inbox normally
- [x] Upload page shows progress bar and status updates
- [x] Upload page handles errors gracefully with retry option
- [x] SessionStorage is cleaned up after successful upload
