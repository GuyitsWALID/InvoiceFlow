# InvoiceFlow - AI-First Invoice Automation Platform

An intelligent invoice processing system for small businesses that automatically extracts, validates, and syncs invoices to accounting software.

## 🚀 Features

- **Automatic Email Ingestion**: Connect Gmail, Outlook, or any IMAP email account
- **AI-Powered OCR**: Extract structured data from invoices with confidence scores
- **Human-in-the-Loop Review**: Review and correct invoices with visual validation
- **Accounting Integration**: Sync to QuickBooks Online, Xero, and more
- **Multi-Currency Support**: Handle invoices in multiple currencies
- **Duplicate Detection**: Automatically identify and flag duplicate invoices
- **Role-Based Access**: Admin, Accountant, Approver, and Viewer roles
- **Audit Trail**: Complete history of changes and approvals
- **Analytics Dashboard**: Track processing metrics and confidence scores

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL), Next.js API Routes
- **Authentication**: Supabase Auth
- **OCR/AI**: Google Document AI / Amazon Textract
- **Storage**: Supabase Storage
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account (free tier works)
- Google Cloud account (for Document AI) OR AWS account (for Textract)
- QuickBooks Developer account (for accounting integration)

## 🛠️ Installation

### 1. Clone and Install Dependencies

\`\`\`bash
git clone <your-repo-url>
cd InvoiceFlow
npm install
\`\`\`

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Create a storage bucket named `invoices` with public access
4. Copy your project URL and anon key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth (for Gmail)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Microsoft OAuth (for Outlook)
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Document AI (Google Cloud)
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account.json

# OR Amazon Textract (Alternative)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# QuickBooks OAuth
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/integrations/quickbooks/callback

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=your_32_character_encryption_key_here
\`\`\`

### 4. Set Up Google Document AI (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Document AI API
3. Create a service account and download the JSON key
4. Create a Document AI processor (Invoice Parser)
5. Update environment variables with your project ID and credentials path

### 5. Set Up OAuth Integrations

#### Gmail/Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:3000/api/integrations/gmail/callback`
4. Enable Gmail API

#### QuickBooks OAuth:
1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create an app and get client ID/secret
3. Add redirect URI: `http://localhost:3000/api/integrations/quickbooks/callback`

### 6. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

\`\`\`
InvoiceFlow/
├── app/                      # Next.js 14 app directory
│   ├── api/                  # API routes
│   │   ├── invoices/         # Invoice processing endpoints
│   │   ├── integrations/     # OAuth & sync endpoints
│   │   └── ocr/              # Document extraction
│   ├── dashboard/            # Main application pages
│   │   ├── inbox/            # Invoice inbox
│   │   ├── review/           # Review queue
│   │   ├── invoices/         # Invoice details
│   │   ├── settings/         # Settings pages
│   │   └── layout.tsx        # Dashboard layout
│   ├── login/                # Authentication
│   ├── signup/
│   ├── onboarding/           # First-time setup wizard
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── invoice/              # Invoice-specific components
│   └── dashboard/            # Dashboard components
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── utils.ts              # Utility functions
│   └── ocr/                  # OCR service integrations
├── types/                    # TypeScript type definitions
├── supabase/
│   └── schema.sql            # Database schema
├── public/                   # Static assets
└── README.md
\`\`\`

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables
4. Deploy!

\`\`\`bash
npm run build
\`\`\`

### Environment Variables for Production

Make sure to update these in your production environment:
- Change `NEXT_PUBLIC_APP_URL` to your production domain
- Update all OAuth redirect URIs
- Use production Supabase project
- Secure your `ENCRYPTION_KEY`

## 📖 Usage Guide

### First-Time Setup

1. **Sign Up**: Create an account at `/signup`
2. **Connect Email**: Go to Settings → Integrations → Connect Gmail/Outlook
3. **Connect Accounting**: Connect QuickBooks or Xero
4. **Configure Company**: Set currency, tax codes, GL accounts
5. **Test with Sample**: Upload a sample invoice to test the flow

### Daily Workflow

1. **Inbox**: New invoices appear automatically from connected email
2. **Review**: Click on invoices needing attention (low confidence)
3. **Validate**: Review extracted fields against PDF preview
4. **Approve**: Approve to sync to accounting system
5. **Monitor**: Check dashboard for processing metrics

### User Roles

- **Admin**: Full access, manage users and settings
- **Accountant**: Review, approve, and manage invoices
- **Approver**: Review and approve invoices
- **Viewer**: Read-only access

## 🔒 Security

- Row-Level Security (RLS) enabled on all tables
- OAuth tokens encrypted at rest
- TLS in transit for all communications
- Role-based access control
- Complete audit trail
- Data retention policies

## 🧪 Testing

\`\`\`bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build
\`\`\`

## 📚 API Documentation

### Invoice Endpoints

- `POST /api/invoices/upload` - Upload invoice file
- `GET /api/invoices` - List invoices
- `GET /api/invoices/[id]` - Get invoice details
- `PATCH /api/invoices/[id]` - Update invoice
- `POST /api/invoices/[id]/approve` - Approve and sync

### Integration Endpoints

- `GET /api/integrations/gmail/authorize` - Start Gmail OAuth
- `GET /api/integrations/quickbooks/authorize` - Start QuickBooks OAuth
- `POST /api/integrations/[type]/sync` - Trigger manual sync

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: [Link to docs]
- Email: support@invoiceflow.com

## 🗺️ Roadmap

- [ ] Xero integration
- [ ] Sage integration
- [ ] Mobile app (iOS/Android)
- [ ] Advanced fraud detection
- [ ] Multi-language support expansion
- [ ] Batch approval workflows
- [ ] Custom field extraction
- [ ] API for third-party integrations
- [ ] White-label option

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database powered by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)

---

Made with ❤️ for small businesses worldwide
\`\`\`
