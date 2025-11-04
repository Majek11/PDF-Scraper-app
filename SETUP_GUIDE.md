# Quick Setup Guide

## ✅ What's Already Fixed

All dependency conflicts, runtime errors, and configuration issues have been resolved. The application runs successfully on **http://localhost:3000**.

## 🔧 What You Need to Do

The only remaining step is to **configure your database**. Here's how:

### Option 1: Local PostgreSQL (Recommended for Development)

```bash
# 1. Install PostgreSQL (if not already installed)
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# macOS:
brew install postgresql

# 2. Start PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql  # macOS

# 3. Create database
sudo -u postgres createdb resume_scraper

# 4. Update .env with your database URL
# Edit /home/majek/Downloads/code/.env and replace:
DATABASE_URL="postgresql://postgres:password@localhost:5432/resume_scraper"
# Adjust username/password as needed

# 5. Run migrations
cd /home/majek/Downloads/code
npx prisma migrate dev
# or
npx prisma db push

# 6. Generate Prisma Client
npx prisma generate
```

### Option 2: Use a Cloud Database (Recommended for Production)

**Supabase (Free Tier):**
1. Go to https://supabase.com
2. Create new project
3. Get connection string from Settings → Database
4. Update `DATABASE_URL` in `.env`
5. Run `npx prisma db push`

**Neon (Free Tier):**
1. Go to https://neon.tech
2. Create new project
3. Copy connection string
4. Update `DATABASE_URL` in `.env`
5. Run `npx prisma db push`

### Generate NEXTAUTH_SECRET

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env:
NEXTAUTH_SECRET="<generated-secret-here>"
```

### Add OpenAI API Key (for resume extraction)

```bash
# Get API key from https://platform.openai.com/api-keys
# Add to .env:
OPENAI_API_KEY="sk-..."
```

### Optional: Configure Supabase Storage (for PDF uploads)

If you want to use Supabase for file storage:
1. Create Supabase project
2. Create a storage bucket named "resumes"
3. Add to `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## 🚀 Start the Application

```bash
cd /home/majek/Downloads/code
npm run dev
```

Visit: **http://localhost:3000**

## 📝 Test the Application

1. Click "Get Started" to sign up
2. Create an account
3. Log in
4. Upload a resume PDF
5. View extracted data

## 🎯 Current Status

| Feature | Status |
|---------|--------|
| Build | ✅ Working |
| Dev Server | ✅ Running on port 3000 |
| Authentication | ✅ JWT-based sessions |
| Session Management | ✅ SessionProvider configured |
| Theme Support | ✅ Dark/Light mode |
| Database | ⏳ Needs configuration |
| File Upload | ✅ Ready (needs Supabase if using storage) |
| PDF Extraction | ✅ Ready (needs OpenAI API key) |

## 🐛 Troubleshooting

### Database Connection Errors
- Verify PostgreSQL is running
- Check DATABASE_URL format is correct
- Ensure database exists: `createdb resume_scraper`

### Prisma Errors
```bash
# Regenerate client
npx prisma generate

# Reset database
npx prisma migrate reset

# View database
npx prisma studio
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or let Next.js use another port
# It will automatically try 3001, 3002, etc.
```

## 📚 More Information

- NextAuth JWT docs: https://next-auth.js.org/configuration/options#jwt
- Prisma docs: https://www.prisma.io/docs
- Next.js docs: https://nextjs.org/docs

---

**You're almost there!** Just set up the database and you're ready to go! 🎉
