# InvoiceFlow - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, React, Supabase, Tailwind CSS, and shadcn/ui components.

### Step 2: Set Up Supabase

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Note your project URL and anon key

2. **Run Database Schema**
   - Open Supabase SQL Editor
   - Copy and paste contents of `supabase/schema.sql`
   - Run the query

3. **Create Storage Bucket**
   - Go to Storage in Supabase dashboard
   - Create a new bucket named `invoices`
   - Make it public

### Step 3: Configure Environment

Create `.env.local` file:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption (Generate a random 32 character string)
ENCRYPTION_KEY=your-random-32-character-key-here
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 - you should see the login page!

### Step 5: Create First Account

1. Go to http://localhost:3000/signup
2. Fill in your details
3. You'll be redirected to the dashboard

## 📋 What's Included

### ✅ Core Features Implemented

- **Authentication System**
  - Signup/Login with Supabase Auth
  - Role-based access control (Admin, Accountant, Approver, Viewer)
  - Protected routes with middleware

- **Dashboard Interface**
  - Responsive sidebar navigation
  - Main dashboard with metrics cards
  - Invoice listing with filters and search
  - Status-based tabs (Inbox, Needs Review, etc.)

- **Database Schema**
  - Companies, Users, Vendors, Invoices, Line Items
  - Integrations, Company Settings, Audit Logs
  - Row-Level Security (RLS) policies
  - Automatic timestamps and audit triggers

- **API Routes**
  - GET/POST /api/invoices - List and create invoices
  - GET/PATCH/DELETE /api/invoices/[id] - Invoice operations
  - POST /api/invoices/[id]/approve - Approval workflow

- **UI Components (shadcn/ui)**
  - Button, Input, Card, Label, Badge
  - Tabs, Toast, Progress, Separator
  - Fully customizable with Tailwind CSS

- **Utilities**
  - Currency formatting
  - Date formatting
  - Confidence score visualization
  - Duplicate detection logic
  - File upload helpers

### 🚧 Features Ready for Integration

These features are designed but need API keys to function:

1. **Email Ingestion** (Needs Gmail/Outlook OAuth)
2. **OCR Processing** (Needs Google Document AI or AWS Textract)
3. **QuickBooks Sync** (Needs QuickBooks Developer Account)

## 🔧 Next Steps

### 1. Set Up Email Integration (Optional)

To enable automatic email ingestion:

```bash
# Add to .env.local
GOOGLE_CLIENT_ID=your_google_oauth_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

Then create OAuth credentials at: https://console.cloud.google.com

### 2. Set Up Document AI (Optional)

For automatic OCR extraction:

```bash
# Add to .env.local
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

Setup guide: https://cloud.google.com/document-ai/docs/setup

### 3. Set Up QuickBooks (Optional)

For accounting integration:

```bash
# Add to .env.local
QUICKBOOKS_CLIENT_ID=your_qb_client_id
QUICKBOOKS_CLIENT_SECRET=your_qb_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/integrations/quickbooks/callback
```

Get credentials: https://developer.intuit.com/

## 📁 Key Files to Know

### Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `next.config.js` - Next.js configuration
- `middleware.ts` - Route protection

### Database
- `supabase/schema.sql` - Complete database schema with RLS

### Types
- `types/index.ts` - TypeScript interfaces for the app
- `types/supabase.ts` - Generated Supabase types

### Core Logic
- `lib/utils.ts` - Utility functions (formatting, validation, etc.)
- `lib/supabase/client.ts` - Browser Supabase client
- `lib/supabase/server.ts` - Server Supabase client

### Pages
- `app/page.tsx` - Root redirect
- `app/login/page.tsx` - Login page
- `app/signup/page.tsx` - Signup page
- `app/dashboard/page.tsx` - Main dashboard
- `app/dashboard/layout.tsx` - Dashboard layout with sidebar
- `app/dashboard/inbox/page.tsx` - Invoice inbox

### API Routes
- `app/api/invoices/route.ts` - List/Create invoices
- `app/api/invoices/[id]/route.ts` - Get/Update/Delete invoice
- `app/api/invoices/[id]/approve/route.ts` - Approve & sync

## 🎨 Customization

### Change Theme Colors

Edit `app/globals.css`:

```css
:root {
  --primary: 222.2 47.4% 11.2%;  /* Your brand color */
  --success: 142 71% 45%;         /* Green for success */
  --warning: 38 92% 50%;          /* Amber for warnings */
}
```

### Add New Status Types

1. Update `types/index.ts`:
```typescript
export type InvoiceStatus = 
  | 'inbox' 
  | 'needs_review' 
  | 'approved' 
  | 'synced' 
  | 'rejected' 
  | 'duplicate'
  | 'your_new_status'  // Add here
```

2. Update database enum in Supabase

3. Update `lib/utils.ts` color mappings

## 🐛 Common Issues

### Port Already in Use
```bash
# Use different port
npm run dev -- -p 3001
```

### Supabase Connection Error
- Check your `.env.local` has correct URL and keys
- Verify Supabase project is running
- Check RLS policies are enabled

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### TypeScript Errors
```bash
# Run type check
npm run type-check

# Install missing types
npm install --save-dev @types/node
```

## 📊 Database Schema Overview

```
companies
├── users (FK: company_id)
├── vendors (FK: company_id)
├── invoices (FK: company_id, vendor_id)
│   └── line_items (FK: invoice_id)
├── integrations (FK: company_id)
├── company_settings (FK: company_id)
└── audit_logs (FK: company_id, user_id, invoice_id)
```

## 🔐 Security Features

- ✅ Row-Level Security on all tables
- ✅ Authentication required for all dashboard routes
- ✅ Role-based access control
- ✅ Encrypted OAuth tokens
- ✅ Audit trail for all changes
- ✅ Secure password hashing (Supabase Auth)

## 💡 Development Tips

### Hot Reload Issues
If changes aren't reflecting:
```bash
# Stop server (Ctrl+C)
# Clear cache
rm -rf .next
# Restart
npm run dev
```

### Database Changes
After modifying `supabase/schema.sql`:
1. Run the new migration in Supabase SQL Editor
2. Regenerate types (optional): `npx supabase gen types typescript`

### Adding New Pages
1. Create file in `app/dashboard/your-page/page.tsx`
2. Add route to navigation in `app/dashboard/layout.tsx`
3. Add RLS policies if needed

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Change `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Update all OAuth redirect URIs
- [ ] Use production Supabase project
- [ ] Generate secure `ENCRYPTION_KEY`
- [ ] Enable RLS on all tables
- [ ] Set up monitoring and error tracking
- [ ] Configure backup strategy
- [ ] Test all user flows
- [ ] Review security headers

## 📞 Need Help?

1. Check the main [README.md](./README.md)
2. Review [Next.js Documentation](https://nextjs.org/docs)
3. Check [Supabase Documentation](https://supabase.com/docs)
4. Review [shadcn/ui Components](https://ui.shadcn.com/)

---

**You're all set! 🎉**

Start building your invoice automation platform. The foundation is solid, and you can extend it with OCR, email ingestion, and accounting integrations as needed.
