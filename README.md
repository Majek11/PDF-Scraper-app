# PDF Scraper - Technical Assignment

A production-ready Next.js application that allows users to upload and extract structured data from PDF documents using OpenAI, with an optional Stripe subscription system.

**Note:** This application processes ANY PDF document. It includes an opinionated schema optimized for resumes/CVs but can extract from other PDFs as well.

## 🎯 Features

### Core Features
- ✅ **Authentication**: Secure email/password authentication with NextAuth
- ✅ **PDF Upload**: Support for PDFs up to 10MB with intelligent processing
- ✅ **Smart Extraction**: Uses OpenAI to extract structured data
- ✅ **Multiple PDF Types**: Handles text-based, image-based, and hybrid PDFs
- ✅ **Dashboard**: View, download, and manage all uploaded PDFs
- ✅ **Resume Schema Included**: Complete resume schema available if needed

### Optional Stripe Integration
- ✅ **Credit System**: 100 credits per resume extraction
- ✅ **Subscription Plans**: Basic ($10/month, 10k credits) and Pro ($20/month, 20k credits)
- ✅ **Automatic Billing**: Stripe webhooks for subscription management
- ✅ **Customer Portal**: Self-service billing management

## 🏗️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase PostgreSQL + Prisma ORM
- **Authentication**: NextAuth v4
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4o
- **Payments**: Stripe (optional)
- **Styling**: TailwindCSS + shadcn/ui
- **Validation**: Zod

## 📋 Extracted Data Schema

The application extracts the following structured data from resumes (matching exact specification):

```typescript
{
  profile: {
    name, surname, email, headline, professionalSummary,
    linkedIn, website, country, city, relocation, remote
  },
  workExperiences: [{
    jobTitle, employmentType, locationType, company,
    startMonth, startYear, endMonth, endYear, current, description
  }],
  educations: [{
    school, degree, major, startYear, endYear, current, description
  }],
  skills: [...],
  licenses: [{ name, issuer, issueYear, description }],
  languages: [{ language, level }],
  achievements: [{ title, organization, achieveDate, description }],
  publications: [{ title, publisher, publicationDate, publicationUrl, description }],
  honors: [{ title, issuer, issueMonth, issueYear, description }]
}
```

**Supported Enums:**
- `employmentType`: FULL_TIME, PART_TIME, INTERNSHIP, CONTRACT
- `locationType`: ONSITE, REMOTE, HYBRID
- `degree`: HIGH_SCHOOL, ASSOCIATE, BACHELOR, MASTER, DOCTORATE
- `level` (language): BEGINNER, INTERMEDIATE, ADVANCED, NATIVE

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier)
- OpenAI API key
- Stripe account (optional, for subscriptions)

### 1. Clone and Install

```bash
git clone <repository-url>
cd pdf-resume-scraper
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
```env
DATABASE_URL="postgresql://..."  # From Supabase
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
OPENAI_API_KEY="sk-..."
```

Optional (for Stripe):
```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_BASIC="price_..."
STRIPE_PRICE_PRO="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Database Setup

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 4. Supabase Storage Setup

1. Go to your Supabase dashboard → **Storage**
2. Create a bucket named `resumes` (keep it private)
3. Add the following policies:

**Policy 1 - Upload:**
```sql
CREATE POLICY "Users can upload their own resumes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2 - Read:**
```sql
CREATE POLICY "Users can view their own resumes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3 - Delete:**
```sql
CREATE POLICY "Users can delete their own resumes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resumes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 💳 Stripe Setup (Optional)

**Important:** The application works fully without Stripe configuration. If you don't configure Stripe keys (or leave them as placeholder values), users can upload and process PDFs without any credit restrictions. Stripe is only needed if you want to monetize with a subscription model.

### 1. Create Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Create two products:

**Basic Plan:**
- Name: "Basic Plan"
- Price: $10.00 monthly recurring
- Copy the Price ID → `STRIPE_PRICE_BASIC`

**Pro Plan:**
- Name: "Pro Plan"  
- Price: $20.00 monthly recurring
- Copy the Price ID → `STRIPE_PRICE_PRO`

### 2. Get API Keys

1. Go to **Developers → API keys**
2. Copy:
   - `Secret key` → `STRIPE_SECRET_KEY`
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 3. Setup Webhooks (for production)

1. Go to **Developers → Webhooks**
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy `Signing secret` → `STRIPE_WEBHOOK_SECRET`

### 4. Test Locally with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Use test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
```

## 📦 Large File Handling (>4MB)

Vercel has a 4MB payload limit for serverless functions. This application handles files up to 10MB using the following approach:

### Current Implementation
- Files are uploaded directly to Supabase Storage (which supports files up to 50MB)
- The upload happens in the API route before the 4MB limit is reached
- File buffer is then passed to OpenAI for processing

### For Files >10MB (Future Enhancement)
If you need to handle files larger than 10MB:

1. **Client-side direct upload to Supabase:**
   - Generate a signed upload URL from the API
   - Upload file directly from browser to Supabase
   - Trigger processing after upload completes

2. **External processing service:**
   - Use a separate service (AWS Lambda, Google Cloud Functions)
   - Configure with longer timeout limits
   - Process files asynchronously via queue

## 🏗️ Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── resume/        # Resume CRUD operations
│   │   ├── resumes/       # List all resumes
│   │   ├── upload/        # File upload & processing
│   │   ├── user/          # User data endpoints
│   │   ├── stripe/        # Stripe checkout & portal
│   │   └── webhooks/      # Stripe webhook handler
│   ├── dashboard/         # Resume history page
│   ├── login/             # Auth page
│   ├── settings/          # Subscription management
│   └── upload/            # PDF upload page
├── components/
│   ├── nav.tsx            # Navigation component
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── extract-resume.ts  # PDF extraction logic
│   ├── prisma.ts          # Prisma client
│   ├── stripe.ts          # Stripe configuration
│   ├── supabase.ts        # Supabase client
│   └── validations.ts     # Zod schemas
├── prisma/
│   └── schema.prisma      # Database schema
└── scripts/
    ├── 01-setup-database.sql
    └── 02-add-stripe-fields.sql
```

## 🧪 Testing

### Test User Registration
1. Go to `/login`
2. Click "Create account"
3. Register with any email/password
4. You'll be redirected to `/upload`

### Test Resume Upload
1. Upload a PDF resume (< 10MB)
2. Wait for extraction (10-30 seconds)
3. View results in `/dashboard`

### Test Stripe (Optional)
1. Go to `/settings`
2. Click "Subscribe to Basic" or "Subscribe to Pro"
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify credits are added

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Add all variables from .env (use production values)
```

### Post-Deployment Setup

1. **Update Supabase policies** to match production URL
2. **Update Stripe webhook** endpoint to production URL
3. **Test end-to-end** flow with real Stripe webhooks

## 📊 Database Schema

### User Model
```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  password          String
  credits           Int      @default(0)
  planType          String   @default("FREE")
  stripeCustomerId  String?  @unique
  stripeSubscriptionId String? @unique
  // ... other Stripe fields
}
```

### Resume Model
```prisma
model Resume {
  id            String   @id @default(cuid())
  userId        String
  fileName      String
  fileSize      Int
  fileUrl       String
  extractedData Json     // Stores the complete schema
  status        String   // processing, completed, failed
  createdAt     DateTime @default(now())
}
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Test connection
PGPASSWORD=your_password psql -h your_host -p 5432 -U your_user your_db -c "SELECT 1;"

# Regenerate Prisma client
npx prisma generate
```

### OpenAI Errors
- Check API key is valid
- Ensure sufficient credits in OpenAI account
- Verify model access (gpt-4o)

### Stripe Webhook Issues
- Use Stripe CLI for local testing
- Check webhook signing secret matches
- Verify endpoint URL is correct
- Check webhook logs in Stripe dashboard

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login (handled by NextAuth)

### Resumes
- `GET /api/resumes` - List all user resumes
- `GET /api/resume/[id]` - Get single resume
- `DELETE /api/resume/[id]` - Delete resume
- `GET /api/resume/[id]/download` - Get signed download URL
- `POST /api/upload` - Upload and process PDF

### User
- `GET /api/user/me` - Get current user data (credits, plan)

### Stripe (Optional)
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create customer portal session
- `POST /api/webhooks/stripe` - Handle Stripe events

## 🎨 UI Components

Built with [shadcn/ui](https://ui.shadcn.com/):
- Button, Card, Dialog, Dropdown Menu
- Table, Toast, Progress, Avatar
- Alert Dialog, Form components

## 📄 License

MIT

## 👤 Author

Created for Undetectable AI Technical Assignment

---

## 📞 Support

For issues or questions:
- Check troubleshooting section above
- Review Stripe/Supabase documentation
- Contact: umur@undetectable.ai or baris@undetectable.ai
