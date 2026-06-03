# Dilo 🇪🇸

A little Spanish app I built to keep myself practicing. It gives you a handful of
phrases a day to work into conversation — and now you can actually **call a voice
agent and practice them out loud**.

I started it as a text-only "phrase of the day" thing a few months back. Recently I
extended it into a voice agent: tap a phrase, a panel slides out, and you have a
short spoken conversation in Spanish built around that phrase. I'm using it to
practice my own Spanish here in Madrid.

## What's in here

**The original app**
- Daily Spanish phrases generated with OpenAI (region + formality aware)
- Verb conjugation tooltips, alternatives, progress tracking
- Supabase for auth + storage

**The voice agent (the new part)**
- Tap **Practicar** on a phrase → a frosted-glass panel slides in
- Live spoken conversation with a Madrid-Spanish tutor
- Gentle corrections, English help when you're stuck, adjustable speech speed
- Live transcript + per-turn latency right on screen
- An **Admin** dashboard that logs every call: latency, interruptions, and where
  the agent breaks down

## Stack

Next.js (App Router) · TypeScript · Tailwind/shadcn · Supabase · OpenAI

For voice: **[Vapi](https://vapi.ai)** runs the call loop, with **Speechmatics**
(speech-to-text), **Claude Haiku 4.5** (the tutor brain), and **ElevenLabs** (the
voice). I went through a few transcribers before landing on Speechmatics — notes on
why are in [`TUNING_LOG.md`](./TUNING_LOG.md).

## How the voice part fits together

```
 Browser (Practicar panel)            Vapi                    This app
 ─────────────────────────   WebRTC   ───────────   events   ─────────────────────
  @vapi-ai/web SDK         ◄────────►  Speechmatics  ───────►  /api/vapi/webhook
   • live transcript                   Claude Haiku            → Supabase
   • per-turn latency                  ElevenLabs              (voice_sessions,
                                                                voice_turns)
                                                              /practice/sessions
                                                               reads it back (Admin)
```

The assistant is configured from code (`/api/vapi/setup`) instead of by hand in the
dashboard, so it's reproducible and lives in git. Each call injects the day's phrase
as the topic via Vapi `variableValues`.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev
```

Open http://localhost:3000. You'll need OpenAI + Supabase keys for the base app, and
Vapi + a webhook tunnel for the voice part — full voice setup is in
[`VOICE_SETUP.md`](./VOICE_SETUP.md).

```bash
npm run test    # vitest
npm run lint
```

## How I work in this repo

- `main` stays deployable. Features go on their own branch (`voice-agent`, etc.) and
  come back through a PR.
- Small, focused commits with messages that say *why*, not just *what*.
- Secrets live in `.env.local` (gitignored). `.env.example` documents what's needed.
- Config-as-code where I can — the Vapi assistant is set up by an API route, not
  clicked together in a dashboard, so it's reviewable and reproducible.

## Layout

```
src/
  app/
    page.tsx                 # home — daily phrases + the Practicar panel
    practice/                # standalone practice route + /sessions dashboard
    api/
      phrases/ · conjugate/  # original text-gen routes
      vapi/setup · webhook   # configure the agent + ingest call data
  components/
    PracticePanel.tsx        # the voice call UI (reused by panel + route)
    PhraseListItem.tsx       # a phrase row + its Practicar button
  lib/
    voice/prompt.ts          # tutor prompt (shares region logic with text phrases)
    ai/                      # OpenAI phrase generation
supabase/voice_schema.sql    # tables for call sessions + turns
```
