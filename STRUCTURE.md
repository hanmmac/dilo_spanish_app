# Repository Structure

This document outlines the current repository structure for the Dilo Spanish learning app.

## Current Structure

```
dilo_spanish_app/
├── src/                               # Next.js application code
│   ├── app/                           # Next.js App Router
│   │   ├── api/                       # Backend API routes
│   │   │   ├── phrases/
│   │   │   │   └── route.ts           # GET /api/phrases - Generate/translate phrases
│   │   │   └── conjugate/
│   │   │       └── route.ts           # GET /api/conjugate - Verb conjugation
│   │   │
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts           # Supabase auth callback handler
│   │   │
│   │   ├── page.tsx                   # Main home page
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css                # Global styles
│   │   └── global-error.tsx           # Global error boundary
│   │
│   ├── components/                    # React components
│   │   ├── Auth.tsx                   # Authentication UI (login/signup)
│   │   ├── PhraseListItem.tsx         # Individual phrase display
│   │   ├── AlternativesModal.tsx      # Alternative phrases modal
│   │   ├── VerbConjugation.tsx        # Verb conjugation hover card
│   │   ├── SettingsModal.tsx          # Settings modal
│   │   ├── ProgressBar.tsx            # Progress tracking component
│   │   ├── ErrorReporter.tsx          # Error reporting component
│   │   │
│   │   └── ui/                        # Shadcn UI components
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── select.tsx
│   │       ├── tooltip.tsx
│   │       ├── hover-card.tsx
│   │       └── ... (other UI components)
│   │
│   ├── lib/                           # Application logic
│   │   ├── ai/                        # AI integration
│   │   │   ├── client.ts              # OpenAI client setup
│   │   │   └── phrases.ts            # Phrase generation & translation logic
│   │   │
│   │   ├── supabase.ts                # Supabase client initialization
│   │   ├── supabase-storage.ts        # Supabase database operations (phrases)
│   │   ├── api-auth.ts                # API authentication & rate limiting
│   │   └── utils.ts                   # Utility functions (cn, etc.)
│   │
│   ├── hooks/                         # React hooks
│   │   └── use-mobile.ts             # Mobile detection hook
│   │
│   ├── types/                         # TypeScript types
│   │   └── phrase.ts                 # Phrase type definitions
│   │
│   └── visual-edits/                  # Development tools (dev-only)
│       ├── VisualEditsMessenger.tsx
│       └── component-tagger-loader.js
│
├── public/                            # Static assets
│   └── images/                        # Region background images
│       ├── costa-rica-beach.jpg
│       ├── spain-barcelona.jpg
│       ├── mexico-city.jpg
│       ├── argentina-buenos-aires.jpg
│       ├── colombia-cartagena.jpg
│       ├── caribbean-havana.jpg
│       └── general-lima.jpg
│
├── .env.local                         # Environment variables (gitignored)
├── .env.example                       # Example env file
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── components.json                    # Shadcn UI config
├── README.md
├── DEPLOYMENT.md                      # Deployment guide
└── STRUCTURE.md                       # This file
```

## Architecture Overview

### Frontend (`src/app/`)
- **`page.tsx`** - Main application page with phrase list, region/formality selection
- **`layout.tsx`** - Root layout with error boundaries and visual edits (dev-only)
- **`globals.css`** - Global styles and Tailwind configuration

### Backend API Routes (`src/app/api/`)
- **`phrases/route.ts`** - Generates new phrases or translates existing ones for different regions/formality
- **`conjugate/route.ts`** - Returns verb conjugations for hover tooltips

### Authentication (`src/app/auth/`)
- **`callback/route.ts`** - Handles Supabase authentication callbacks (email confirmation, etc.)

### Components (`src/components/`)
- **Core Components**: `Auth`, `PhraseListItem`, `AlternativesModal`, `VerbConjugation`, `SettingsModal`, `ProgressBar`
- **UI Components**: Shadcn UI component library in `ui/` folder

### Libraries (`src/lib/`)
- **`ai/`** - OpenAI integration for phrase generation and translation
- **`supabase.ts`** - Supabase client initialization
- **`supabase-storage.ts`** - Database operations for storing/retrieving user phrases
- **`api-auth.ts`** - API route authentication and rate limiting logic
- **`utils.ts`** - Shared utility functions

### Hooks (`src/hooks/`)
- **`use-mobile.ts`** - Responsive design hook for mobile detection

### Types (`src/types/`)
- **`phrase.ts`** - TypeScript interfaces for phrases, alternatives, and API responses

## Key Features

### 1. **AI-Powered Phrase Generation**
- Uses OpenAI GPT-4o-mini to generate Spanish phrases
- Supports multiple regions (Costa Rica, Spain, Mexico, Argentina, Colombia, Caribbean, General)
- Formality levels: formal, informal, neutral
- Difficulty levels: Easy, Medium, Hard (based on verb complexity and vocabulary)

### 2. **Supabase Backend**
- User authentication (email/password)
- Cloud storage for user phrases (cross-device sync)
- Rate limiting via `api_usage` table
- Row Level Security (RLS) policies for data protection

### 3. **Interactive Features**
- Verb conjugation tooltips (hover over verbs)
- Alternative phrase suggestions
- Voice pronunciation (Web Speech API)
- Progress tracking (phrase completion)

### 4. **Data Persistence**
- Phrases stored in Supabase `user_phrases` table
- 14-day history tracking to prevent duplicate phrases
- Both formal and informal versions cached for instant switching

## Environment Variables

Required in `.env.local`:
- `OPENAI_API_KEY` - OpenAI API key for phrase generation
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Database Schema (Supabase)

### `user_phrases` Table
- Stores user's daily phrases per region/formality combination
- Unique constraint on `(user_id, date, region, formality)`
- Foreign key to `auth.users(id)` with CASCADE

### `api_usage` Table
- Tracks API calls for rate limiting (100 requests per 24 hours)
- Foreign key to `auth.users(id)` with CASCADE

## Development Tools

- **Visual Edits** (`src/visual-edits/`) - Development-only tools for visual editing (only loads in dev mode)

## Key Principles

1. **Next.js App Router**: Follows Next.js 15 conventions
2. **Type Safety**: TypeScript throughout with shared types
3. **Component Library**: Shadcn UI for consistent design
4. **Cloud-First**: Supabase for backend, authentication, and storage
5. **AI Integration**: OpenAI for dynamic content generation
6. **Rate Limiting**: API protection with usage tracking
