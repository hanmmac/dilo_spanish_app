# Dilo - Spanish Learning App

A minimal Spanish learning app that helps you practice 10 phrases every day with AI-powered generation.

## Features

- Daily checklist of 10 Spanish phrases
- Region-specific phrases currently specialized in Costa Rica (other regions soon)
- Formality filters for formal, informal, or neutral speech
- AI-generated phrases using OpenAI
- Beautiful UI with rotating Hispanic city backgrounds
- Progress tracking to keep you motivated

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, pnpm, or bun
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Supabase account and project

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

- `src/app/api/phrases/` - API route for AI phrase generation
- `src/app/api/conjugate/` - API route for verb conjugation
- `src/lib/ai/` - OpenAI client and phrase generation logic
- `src/lib/supabase-storage.ts` - Database operations for phrases
- `src/types/phrase.ts` - TypeScript types for phrases
- `src/app/page.tsx` - Main app page with phrase checklist
- `src/components/` - React components for the UI

## How It Works

The app uses OpenAI to generate 10 Spanish phrases daily based on your selected region and formality preference. Phrases are shared across all users for the same day, region, and formality combination, ensuring consistency while reducing API costs.

You can hover over verbs in phrases to see their conjugations, toggle phrase completion, and explore alternative ways to express the same idea.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
