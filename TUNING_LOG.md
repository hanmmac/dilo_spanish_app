# Voice Agent Tuning Log

A running record of how the Dilo Spanish voice agent was tuned, and *why* — the
decisions, the tradeoffs, and what each change was trying to fix. This is the
narrative behind the config in `src/app/api/vapi/setup/route.ts` (all settings
live there as versioned code, not dashboard clicks).

**Stack:** Vapi (orchestration) · Deepgram (STT) · Claude Haiku 4.5 (LLM) ·
ElevenLabs (TTS) · web (WebRTC) + phone (Twilio) transports.

---

## 1. Turn-taking: the agent cut me off when I paused

**Symptom:** As a learner speaking slowly, I'd pause mid-sentence to think and the
agent would jump in as if I'd finished.

**Root cause:** *Endpointing* — the logic that decides when the user's turn is over.
Default `startSpeakingPlan.transcriptionEndpointingPlan.onNoPunctuationSeconds` was
**1.5s**, so a 1.5s thinking pause ended my turn.

**Change:** 1.5s → 2.5s → **3.0s**.

**Tradeoff:** more patience = the agent feels slightly slower to respond. For a
language learner that's the right call; for a snappy commercial agent you'd want it
lower. This is the core tension of turn-taking and it has no universal "right" value —
it's a product decision.

## 2. "Jumpy" voice + getting interrupted by my own "umm"

**Symptom:** The agent's speech felt choppy and it would stop/restart when I made any
small sound.

**Root cause:** `stopSpeakingPlan.numWords: 0` — *any* detected sound counted as a
barge-in, so a cough or filler word made the agent duck and restart. Plus the voice
had no `stability` set.

**Change:** `numWords` 0 → 3 → (later corrected, see #4). Added voice `stability: 0.6`,
`similarityBoost: 0.75`, `speed: 0.95`.

## 3. The call hung up while I was thinking

**Symptom:** Call ended after ~3 turns with an "error."

**Root cause (from Vapi call logs):** not an error — `endedReason: silence-timed-out`.
The default silence timeout (~30s) is far too short for a learner composing a sentence.

**Change:** `silenceTimeoutSeconds` → **60s**.

**Lesson:** "errors" in voice systems are often expected lifecycle events. Reading the
call's `endedReason` is the first debugging step — the logs told the real story.

## 4. It only caught the *end* of what I said (clipping)

**Symptom:** I said *"me gustaría un café con leche, por favor"* and it transcribed
*"un café con leche, por favor"* — the opening words were gone.

**Root cause:** I had mis-diagnosed #2. The "aggressive interruption" complaint was
really *endpointing* (#1), but I'd raised the *barge-in* threshold (`numWords` to 5).
That made the agent hold the floor longer, so when I answered over its tail, my opening
words were spoken during agent playback and dropped before transcription resumed.

**Change:** put the fixes on the *right* knobs — endpointing for patience (#1), and
pulled barge-in back down (`numWords` 5 → **2**, `voiceSeconds` → 0.3) so the agent
yields fast and captures my opening.

**Lesson:** "patient turn-taking" (don't cut me off) and "fast barge-in" (catch my
opening words) pull in opposite directions through nearby knobs. They have to be split
onto the correct two controls, and even then, audio spoken *over* the agent is
unrecoverable — natural pacing matters.

## 5. ⭐ The agent never corrected my mistakes — and ASR is why

**Symptom:** A *tutor* that's supposed to correct me just re-asked or moved on.

**Root cause (the interesting one):** I said *"un café con **luches**, **pro** favor"*
and Deepgram transcribed *"un café con **leche**, **por** favor."* ASR is built to
produce fluent, valid Spanish, so it **silently corrected my errors before the LLM ever
saw them.** The tutor can't fix a mistake the transcriber already cleaned up.

**Implication:** This is a *fundamental limitation*, not a config bug. Catching
pronunciation/word errors needs phoneme-level **pronunciation assessment** (e.g. Azure's),
not standard ASR. For a language-learning voice product this is a core architectural
question. (Also: learner/non-native speech is the hard case for ASR generally — switched
Deepgram `nova-3 → nova-2` for Spanish and added café-vocabulary `keywords` biasing to
help.)

**Open experiment:** transcribe the same audio with OpenAI Whisper in parallel and diff
it against Deepgram to quantify how much the "fluent normalization" hides.

## 6. Speech-speed control for the learner

Added a per-call **🐢 Lenta / Media / Normal** speed selector on `/practice`, passed via
Vapi `assistantOverrides.voice.speed` — so the learner slows the agent without changing
the saved assistant config.

## 7. Phrase-seeded conversations (per-call context injection)

Each daily phrase has a **Practicar** button that launches a call seeded with that phrase
as the topic, via Vapi `variableValues` filling a `{{topicLine}}` placeholder in the
prompt. One static assistant, dynamic per-call context — the same pattern production
agents use to personalize calls with caller-specific data.

## 8. Region register: Costa Rica → Madrid

Generalized the prompt's region vocabulary and tuned the `spain` register to real Madrid
usage (`vale`, `tío`, `guay`, `me mola`, `currar`, vosotros, present perfect) across both
the text phrase generator and the voice agent.

---

## Observability (what we measure, and why it matters)

| Signal | Why it matters for a phone-first product |
|---|---|
| Per-turn latency (user speech-end → agent audio-start) | the #1 driver of whether a call feels human |
| ASR vs LLM split (via on-screen transcript) | tells you whether a bad reply was *misheard* or *mis-reasoned* |
| Interruptions / barge-in count | over-eager turn-taking is a top failure mode on real calls |
| Failure flags (high_latency, empty_transcript) | surfaces where the pipeline breaks |
| Web vs phone latency/STT delta | 8kHz phone audio measurably degrades both — worth quantifying |
