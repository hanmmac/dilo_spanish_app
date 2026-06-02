-- Voice practice / observability schema for Dilo
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Two tables:
--   voice_sessions  -- one row per practice call (web or phone)
--   voice_turns     -- one row per assistant turn, with latency + failure flags
--
-- The Vapi webhook (/api/vapi/webhook) writes to these using the service-role key,
-- so RLS below stays locked down to the owner for reads from the browser.

-- ──────────────────────────────────────────────────────────────────────────
-- voice_sessions
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.voice_sessions (
  id              uuid primary key default gen_random_uuid(),
  vapi_call_id    text unique not null,          -- Vapi's call id (idempotency key)
  transport       text not null default 'web',   -- 'web' | 'phone'
  status          text not null default 'active', -- 'active' | 'ended' | 'failed'
  scenario        text,                           -- e.g. 'cafe-costa-rica'
  region          text,                           -- reuses Dilo region vocab
  formality       text,                           -- 'formal' | 'informal' | 'neutral'

  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_ms     integer,

  -- rolled-up metrics (filled from the end-of-call report + turn aggregates)
  turn_count          integer not null default 0,
  interruption_count  integer not null default 0,
  avg_latency_ms      integer,
  p95_latency_ms      integer,

  ended_reason    text,                           -- Vapi endedReason
  report          jsonb,                          -- raw end-of-call-report
  created_at      timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────────
-- voice_turns
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.voice_turns (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.voice_sessions(id) on delete cascade,
  vapi_call_id    text not null,
  turn_index      integer not null,               -- 0-based order within the call

  user_text       text,                           -- what the learner said (STT)
  assistant_text  text,                           -- what the agent replied

  -- the headline metric: user stopped talking -> assistant audio started
  latency_ms      integer,
  -- component breakdown when Vapi reports it
  stt_ms          integer,
  llm_ms          integer,
  tts_ms          integer,

  was_interrupted boolean not null default false, -- learner barged in over the agent
  -- failure / quality flags surfaced for the dashboard, e.g.
  -- ['empty_transcript','high_latency','english_leak','no_input']
  flags           text[] not null default '{}',

  created_at      timestamptz not null default now(),
  unique (vapi_call_id, turn_index)
);

create index if not exists voice_turns_session_idx on public.voice_turns(session_id);
create index if not exists voice_sessions_started_idx on public.voice_sessions(started_at desc);

-- ──────────────────────────────────────────────────────────────────────────
-- Row Level Security
--   For this demo the dashboard reads with the anon key, so we allow public
--   SELECT. Writes only ever happen server-side with the service-role key,
--   which bypasses RLS — so no INSERT/UPDATE policy is granted to anon.
-- ──────────────────────────────────────────────────────────────────────────
alter table public.voice_sessions enable row level security;
alter table public.voice_turns    enable row level security;

drop policy if exists "voice_sessions public read" on public.voice_sessions;
create policy "voice_sessions public read"
  on public.voice_sessions for select
  using (true);

drop policy if exists "voice_turns public read" on public.voice_turns;
create policy "voice_turns public read"
  on public.voice_turns for select
  using (true);
