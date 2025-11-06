# Setup Supabase Storage for Invoice Uploads

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/cihcwbrjrdhqttopkeur/storage/buckets

2. Click **"New bucket"**

3. Configure the bucket:
   - **Name**: `invoices`
   - **Public bucket**: ✅ **YES** (Enable public access)
   - **File size limit**: 10 MB (default)
   - **Allowed MIME types**: Leave empty (or add: `application/pdf`, `image/jpeg`, `image/png`)

4. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

1. Go to Supabase Dashboard > Storage > Policies

2. Click on the **"invoices"** bucket

3. Click **"New policy"**

4. Run the SQL policies from `supabase/storage-setup.sql`:
   - Or manually create policies through the UI following the SQL file

## Step 3: Test the Upload

1. Make sure your development server is running (`npm run dev`)

2. Go to http://localhost:3000/dashboard/inbox

3. Click the **"Upload Invoice"** button

4. You should see options for:
   - **Local Files** - Upload from your computer
   - **Google Drive** - (Coming soon placeholder)
   - **Dropbox** - (Coming soon placeholder)
   - **OneDrive** - (Coming soon placeholder)

5. Select local files and upload a PDF or image invoice

## Features Implemented

✅ **Multi-file upload** - Select and upload multiple invoices at once
✅ **Drag and drop support** - (Native browser file picker)
✅ **File validation** - Only PDF, JPG, PNG files under 10MB
✅ **Progress tracking** - See upload progress for each batch
✅ **Cloud storage buttons** - Placeholders for Google Drive, Dropbox, OneDrive
✅ **Automatic invoice creation** - Creates invoice records in database
✅ **Company isolation** - Files stored in company-specific folders
✅ **Dark mode support** - Upload dialog works in both themes

## File Organization

Files are stored in Supabase Storage with the following structure:
```
invoices/
  └── {company_id}/
      ├── 1699123456-abc123.pdf
      ├── 1699123789-def456.jpg
      └── ...
```

## Future Integrations (Placeholders Ready)

The upload dialog is ready for integration with:
- **Google Drive API** - OAuth flow needed
- **Dropbox API** - OAuth flow needed  
- **OneDrive API** - OAuth flow needed

Each button currently shows a placeholder alert that you can replace with actual integration code.

## Troubleshooting

### "Failed to upload files" error
- Check that the `invoices` bucket exists and is public
- Verify storage policies are set up correctly
- Check browser console for detailed error messages

### "User profile not found" error
- Make sure you're signed in
- Verify your user record exists in the `users` table

### Files not appearing in inbox
- Check that invoice records were created in the database
- Verify the `company_id` matches your user's company
- Check the `attachment_urls` field has the public URL
