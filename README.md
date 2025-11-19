# Dilo - Spanish Learning App

A minimal, beautiful Spanish learning app with AI-powered phrase generation.

## Features

- 🎯 Daily checklist of 10 Spanish phrases
- 🌍 Region-specific phrases (Spain, Mexico, Argentina, Colombia, Caribbean)
- 📝 Formality filters (formal/informal)
- 🤖 AI-generated phrases using OpenAI GPT-3.5-turbo
- 🎨 Glassmorphism UI with rotating Hispanic city backgrounds
- ✅ Progress tracking

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

- `src/app/api/phrases/` - API route for AI phrase generation
- `src/lib/ai/` - OpenAI client and phrase generation logic
- `src/types/phrase.ts` - TypeScript types for phrases
- `src/app/page.tsx` - Main app page with phrase checklist

## How It Works

The app uses OpenAI's GPT-3.5-turbo to generate 10 Spanish phrases daily based on:
- Selected region (general, Spain, Mexico, Argentina, etc.)
- Formality preference (formal/informal/neutral)
- Current date (for daily consistency)

Phrases are generated on-demand when you change region or formality settings, ensuring fresh content while maintaining consistency for the same day.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
