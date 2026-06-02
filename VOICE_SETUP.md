# Dilo Voice Agent — Setup

This is the voice-practice extension: call a Spanish tutor agent (web or phone),
with per-turn latency + interruption + failure-flag instrumentation.

```
Browser /practice ──WebRTC──┐
                            ├──► Vapi assistant (Deepgram STT · gpt-4o-mini · ElevenLabs TTS)
Twilio number ──PSTN────────┘            │
                                         ├── webhook ──► /api/vapi/webhook ──► Supabase
Dashboard /practice/sessions ◄───────────┴── reads ────  voice_sessions / voice_turns
```

## 1. Supabase tables

Open Supabase → SQL Editor → New query → paste **`supabase/voice_schema.sql`** → Run.
This creates `voice_sessions` and `voice_turns` (public read; writes are server-side
with the service-role key).

## 2. Environment variables (`.env.local`)

```
NEXT_PUBLIC_VAPI_PUBLIC_KEY=     # Vapi dashboard → API Keys → Public
NEXT_PUBLIC_VAPI_ASSISTANT_ID=   # the assistant you created (its page URL / settings)
VAPI_PRIVATE_KEY=                # Vapi dashboard → API Keys → Private
VAPI_WEBHOOK_SECRET=             # any random string (also paste into Vapi, step 4)
SUPABASE_SERVICE_ROLE_KEY=       # Supabase → Settings → API → service_role (secret)
```
Restart `npm run dev` after editing.

## 3. Configure the assistant

Two options — either works:

**A) One command (reproducible).** With the env vars above set and the dev server
running, POST to the setup route. It patches your assistant with the tutor prompt,
transcriber, model, and webhook URL:

```bash
curl -X POST "http://localhost:3000/api/vapi/setup?serverUrl=https://YOUR_TUNNEL/api/vapi/webhook"
```
(Pass `&voiceId=<elevenlabs_voice_id>` to also set the voice.)

**B) Dashboard, by hand.** On the assistant:
- **Model:** OpenAI · `gpt-4o-mini`. Paste the system prompt from
  `src/lib/voice/prompt.ts` (`buildTutorSystemPrompt()`), and set the
  **First message** to `TUTOR_FIRST_MESSAGE`.
- **Transcriber:** Deepgram · `nova-2` · language **es**.
- **Voice:** ElevenLabs · a Spanish voice.
- **Server URL:** your webhook (step 4) + the **Server URL Secret** = `VAPI_WEBHOOK_SECRET`.

## 4. Webhook (so calls get persisted)

Vapi must reach your `/api/vapi/webhook`. For local dev, expose it with a tunnel:

```bash
npx ngrok http 3000      # or: vapi listen, cloudflared, etc.
```
Put `https://<tunnel>/api/vapi/webhook` as the assistant **Server URL** and set the
**Server URL Secret** to your `VAPI_WEBHOOK_SECRET`. (In production this is just your
deployed domain — no tunnel needed.)

## 5. Run the demo

```bash
npm run dev
```
- **Web:** open <http://localhost:3000/practice>, click **Start session**, talk in Spanish.
- **Dashboard:** <http://localhost:3000/practice/sessions> — refresh after a call ends to
  see the turn-by-turn latency, interruptions, and flags.

## 6. Phone (stretch)

In Vapi: **Phone Numbers → Buy / Import (Twilio) → attach this assistant**. Call the
number and practice. The same webhook persists it as `transport: "phone"`, so the
dashboard's **Web vs phone avg** card fills in — that's the latency/STT delta to talk
about in the writeup.

## What's instrumented (for the writeup)

| Signal | Source | Stored |
|---|---|---|
| Per-turn latency (user speech-end → agent audio-start) | live: web SDK events · persisted: end-of-call report timing | `voice_turns.latency_ms` |
| Interruptions / barge-in | user final transcript while agent speaking | `voice_turns.was_interrupted`, session count |
| Failure flags (`high_latency`, `empty_transcript`, `interrupted`) | derived in the webhook | `voice_turns.flags[]` |
| Recording + summary + ended reason | Vapi end-of-call report | `voice_sessions.report` |
| Web vs phone latency profile | transport tag on each session | dashboard card |
