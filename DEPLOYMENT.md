# Deployment Guide

This guide walks you through deploying the Dilo Spanish App to production.

## Prerequisites

- [ ] GitHub account and repository set up
- [ ] Supabase project created
- [ ] OpenAI API key
- [ ] Vercel account (recommended) or Netlify account

---

## Step 1: Supabase Setup

### 1.1 Database Tables

Ensure both tables are created in Supabase:

#### `user_phrases` Table
- **Columns:**
  - `id` (uuid, primary key, default: `gen_random_uuid()`)
  - `user_id` (uuid, NOT NULL, foreign key to `auth.users(id)`)
  - `date` (text, NOT NULL)
  - `region` (text, NOT NULL)
  - `formality` (text, NOT NULL)
  - `phrases` (jsonb, NOT NULL)
  - `created_at` (timestamptz, default: `now()`)
  - `updated_at` (timestamptz, default: `now()`)
- **Unique Constraint:** `(user_id, date, region, formality)`
- **Foreign Key:** `user_id` → `auth.users(id)` with CASCADE on delete/update
- **RLS Policies:**
  - Users can INSERT their own records
  - Users can SELECT their own records
  - Users can UPDATE their own records
  - Users can DELETE their own records

#### `api_usage` Table
- **Columns:**
  - `id` (uuid, primary key, default: `gen_random_uuid()`)
  - `user_id` (uuid, NOT NULL, foreign key to `auth.users(id)`)
  - `endpoint` (text, NOT NULL)
  - `created_at` (timestamptz, default: `now()`)
- **Foreign Key:** `user_id` → `auth.users(id)` with CASCADE on delete/update
- **Index:** `(user_id, created_at DESC)` for faster rate limit queries
- **RLS Policies:**
  - Users can INSERT their own records
  - Users can SELECT their own records

### 1.2 Authentication

- [ ] Enable Email/Password authentication in Supabase
- [ ] Configure email templates (optional, but recommended)
- [ ] Test signup/login flow

### 1.3 Get Supabase Credentials

1. Go to Supabase Dashboard → Project Settings → API
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 2: Prepare Images

### 2.1 Add Region Background Images

Place all region background images in `public/images/`:

```
public/
  images/
    costa-rica-beach.jpg
    spain-barcelona.jpg
    mexico-city.jpg
    argentina-buenos-aires.jpg
    colombia-cartagena.jpg
    caribbean-havana.jpg
    general-lima.jpg
```

**Image Requirements:**
- Format: JPG or PNG
- Recommended size: 1920x1080 or larger (for high-quality backgrounds)
- Optimize images before adding (use tools like TinyPNG or ImageOptim)

### 2.2 Verify Image Paths

The code in `src/app/page.tsx` references these exact filenames. Make sure your images match:
- `/images/costa-rica-beach.jpg`
- `/images/spain-barcelona.jpg`
- `/images/mexico-city.jpg`
- `/images/argentina-buenos-aires.jpg`
- `/images/colombia-cartagena.jpg`
- `/images/caribbean-havana.jpg`
- `/images/general-lima.jpg`

---

## Step 3: Environment Variables

### 3.1 Local Development (`.env.local`)

Your `.env.local` should contain:

```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**⚠️ Important:** Never commit `.env.local` to git (it's already in `.gitignore`)

### 3.2 Production (Vercel/Netlify)

Add these same environment variables in your hosting platform:

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add each variable for "Production", "Preview", and "Development"
3. Use the same values as your `.env.local`

**Netlify:**
1. Go to Site Settings → Environment Variables
2. Add each variable
3. Use the same values as your `.env.local`

---

## Step 4: Pre-Deployment Checks

### 4.1 Code Review

- [ ] Remove any `console.log()` statements (except error logging)
- [ ] Remove any debug code or test data
- [ ] Verify all hardcoded values are in environment variables
- [ ] Check that error handling is in place

### 4.2 Build Test

Run a production build locally to catch errors:

```bash
npm run build
```

**Fix any errors before deploying:**
- TypeScript errors
- ESLint errors
- Missing dependencies
- Import errors

### 4.3 Test Production Build Locally

```bash
npm start
```

Visit `http://localhost:3000` and test:
- [ ] Authentication (signup/login)
- [ ] Phrase generation
- [ ] Region switching
- [ ] Formality toggle
- [ ] Verb conjugation
- [ ] Images load correctly

---

## Step 5: Deploy to Vercel (Recommended)

### 5.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### 5.2 Configure Project

1. **Framework Preset:** Next.js (auto-detected)
2. **Root Directory:** `./` (default)
3. **Build Command:** `npm run build` (default)
4. **Output Directory:** `.next` (default)
5. **Install Command:** `npm install` (default)

### 5.3 Add Environment Variables

1. In project settings, go to "Environment Variables"
2. Add:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Add for all environments (Production, Preview, Development)

### 5.4 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Vercel will provide a deployment URL (e.g., `your-app.vercel.app`)

---

## Step 6: Deploy to Netlify (Alternative)

### 6.1 Connect Repository

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository

### 6.2 Configure Build Settings

- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** 18.x or 20.x

### 6.3 Add Environment Variables

1. Go to Site Settings → Environment Variables
2. Add the same variables as Vercel

### 6.4 Deploy

1. Click "Deploy site"
2. Wait for build to complete
3. Netlify will provide a deployment URL

---

## Step 7: Post-Deployment Testing

### 7.1 Functional Tests

Test on your production URL:

- [ ] **Authentication:**
  - Sign up with a new account
  - Verify email (if email verification is enabled)
  - Sign in
  - Sign out

- [ ] **Phrase Generation:**
  - Generate phrases for default region
  - Switch regions
  - Toggle formality
  - Verify phrases persist after refresh

- [ ] **Features:**
  - Hover over verbs to see conjugations
  - Click "Other Ways to Say This" button
  - Toggle phrase completion status
  - Test voice pronunciation

- [ ] **Images:**
  - Verify all region background images load
  - Check images are high quality and display correctly

### 7.2 API Tests

- [ ] Test rate limiting (make 100+ requests to verify 429 response)
- [ ] Check Supabase logs for errors
- [ ] Verify API usage is being logged to `api_usage` table

### 7.3 Performance

- [ ] Check page load times
- [ ] Verify images load quickly
- [ ] Test on mobile devices
- [ ] Test on different browsers

---

## Step 8: Custom Domain (Optional)

### 8.1 Vercel

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

### 8.2 Netlify

1. Go to Site Settings → Domain Management
2. Add custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

---

## Troubleshooting

### Build Errors

**Error: Missing environment variables**
- Solution: Add all required env vars in hosting platform

**Error: Module not found**
- Solution: Run `npm install` and commit `package-lock.json`

**Error: TypeScript errors**
- Solution: Fix all TypeScript errors before deploying

### Runtime Errors

**Error: Supabase connection failed**
- Check: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Check: Supabase project is active and not paused

**Error: OpenAI API errors**
- Check: `OPENAI_API_KEY` is set correctly
- Check: API key has sufficient credits/quota

**Error: Images not loading**
- Check: Images are in `public/images/` directory
- Check: Filenames match exactly (case-sensitive)
- Check: Images are committed to git

### Database Errors

**Error: RLS policy violation**
- Check: RLS policies are set up correctly in Supabase
- Check: User is authenticated before making requests

**Error: Foreign key violation**
- Check: Foreign keys are set up correctly
- Check: `user_id` matches authenticated user

---

## Monitoring

### Recommended Tools

1. **Vercel Analytics** (if using Vercel)
   - Monitor page views, performance, errors

2. **Supabase Dashboard**
   - Monitor database usage
   - Check API usage logs
   - Monitor authentication events

3. **OpenAI Dashboard**
   - Monitor API usage and costs
   - Set up usage alerts

### Key Metrics to Watch

- API request count (rate limiting)
- Database storage usage
- OpenAI API costs
- Error rates
- User signups

---

## Maintenance

### Regular Tasks

- [ ] Monitor OpenAI API costs
- [ ] Check Supabase storage usage
- [ ] Review error logs weekly
- [ ] Update dependencies monthly
- [ ] Backup database (Supabase handles this automatically)

### Updates

1. Test changes locally first
2. Create a new branch for changes
3. Test on preview deployment
4. Merge to main for production deployment

---

## Support

If you encounter issues:

1. Check the error logs in your hosting platform
2. Check Supabase logs
3. Review this deployment guide
4. Check Next.js and Supabase documentation

---

## Quick Reference

### Environment Variables Needed

```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Required Files Structure

```
public/
  images/
    costa-rica-beach.jpg
    spain-barcelona.jpg
    mexico-city.jpg
    argentina-buenos-aires.jpg
    colombia-cartagena.jpg
    caribbean-havana.jpg
    general-lima.jpg
```

### Database Tables

- `user_phrases` - Stores user's daily phrases
- `api_usage` - Tracks API calls for rate limiting

---

**Last Updated:** 2024
**Version:** 1.0

