# Setup Instructions

Follow these steps **in order** to get your PDF Resume Scraper app running:

## Step 1: Install Dependencies

\`\`\`bash
npm install
\`\`\`

## Step 2: Create Storage Bucket (MUST DO FIRST)

**This must be done before running any SQL scripts!**

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/odozqbxjmrqwzdsjecnz
2. Click **Storage** in the left sidebar
3. Click **New bucket** button
4. Enter bucket name: `resumes`
5. **IMPORTANT**: Toggle **Public bucket** to OFF (keep it private)
6. Click **Create bucket**

You should now see the `resumes` bucket in your storage list.

**7. Set up bucket policies for security:**
   - Click on the `resumes` bucket you just created
   - Click the **Policies** tab
   - Click **New Policy** button
   
   **Policy 1 - Allow users to upload their own files:**
   - Click **For full customization** (or **Create policy**)
   - Policy name: `Users can upload their own resumes`
   - Allowed operation: **INSERT**
   - Target roles: **authenticated**
   - USING expression:
     \`\`\`sql
     (bucket_id = 'resumes'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
     \`\`\`
   - Click **Review** → **Save policy**
   
   **Policy 2 - Allow users to view their own files:**
   - Click **New Policy** again
   - Policy name: `Users can view their own resumes`
   - Allowed operation: **SELECT**
   - Target roles: **authenticated**
   - USING expression:
     \`\`\`sql
     (bucket_id = 'resumes'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
     \`\`\`
   - Click **Review** → **Save policy**
   
   **Policy 3 - Allow users to delete their own files:**
   - Click **New Policy** again
   - Policy name: `Users can delete their own resumes`
   - Allowed operation: **DELETE**
   - Target roles: **authenticated**
   - USING expression:
     \`\`\`sql
     (bucket_id = 'resumes'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
     \`\`\`
   - Click **Review** → **Save policy**

## Step 3: Run Database Setup Script

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `scripts/01-setup-database.sql`
4. Paste into the editor
5. Click **Run** (or press Cmd/Ctrl + Enter)

You should see: "Success. No rows returned"

## Step 4: Verify Everything is Set Up

### Check Database Tables
1. Go to **Table Editor** in Supabase
2. You should see two tables: `User` and `Resume`

### Check Storage Bucket
1. Go to **Storage** in Supabase
2. You should see the `resumes` bucket
3. Click on it - it should be empty (that's correct)

### Check Storage Policies
1. In **Storage**, click the `resumes` bucket
2. Click **Policies** tab at the top
3. You should see 3 policies listed:
   - Users can upload their own resumes (INSERT)
   - Users can view their own resumes (SELECT)
   - Users can delete their own resumes (DELETE)

## Step 5: Start the App

\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:3000 in your browser.

## Step 6: Test It Out

1. Click **Get Started** or **Sign In**
2. Click **Create account** tab
3. Sign up with any email/password
4. You'll be redirected to `/upload`
5. Upload a PDF resume (max 10MB)
6. Wait for extraction (10-30 seconds)
7. View results in the dashboard

## Troubleshooting

### "Failed to upload file to storage" or "Access denied"
**Possible causes**:
- Storage bucket doesn't exist - create it in Step 2
- Storage policies not set up - follow Step 2 part 7
- User not authenticated - make sure you're logged in

**Solution**: 
- Go to Storage → resumes bucket → Policies tab
- Make sure all 3 policies are created (INSERT, SELECT, DELETE)
- Each policy should have the USING expression that checks `auth.uid()`

### "Failed to extract resume data"
**Possible causes**:
- Invalid OpenAI API key - check `.env` file
- No credits in OpenAI account - add payment method at platform.openai.com
- PDF is corrupted or password-protected

**How to debug**: Open browser DevTools (F12) → Console tab → look for error messages

### "Authentication error" or "Invalid credentials"
**Solution**: 
- Clear browser cookies
- Make sure `NEXTAUTH_SECRET` is set in `.env`
- Try signing up with a new email

### "Database error" or "Connection refused"
**Solution**: 
- Check `NEON_NEON_DATABASE_URL` in `.env` is correct
- Make sure you ran the database setup script (Step 3)

## What Each Environment Variable Does

- `DATABASE_URL` - Connects to your Supabase Postgres database
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key for client-side Supabase calls
- `SUPABASE_SERVICE_ROLE_KEY` - Secret key for server-side operations (never expose!)
- `OPENAI_API_KEY` - Authenticates with OpenAI API for resume extraction
- `NEXTAUTH_SECRET` - Encrypts session tokens (keep secret!)
- `NEXTAUTH_URL` - Base URL of your app (localhost for dev)

## Next Steps

Once everything works:

- Customize colors in `app/globals.css`
- Modify the resume extraction schema in `lib/validations.ts`
- Add more features (bulk upload, search, filters, etc.)
- Deploy to Vercel when ready

## Need Help?

Check the browser console (F12) for detailed error messages. Most issues are related to:
1. Missing storage bucket
2. Invalid API keys
3. Database not set up
