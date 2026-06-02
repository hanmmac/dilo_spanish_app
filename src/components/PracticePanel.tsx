"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff, Loader2, AlertTriangle } from "lucide-react";
import { buildTopicLine, buildPhraseFirstMessage } from "@/lib/voice/prompt";

type Status = "idle" | "connecting" | "active" | "ending" | "ended";

interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
}

interface TurnMetric {
  latencyMs: number;
}

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
const VOICE_ID = process.env.NEXT_PUBLIC_VAPI_VOICE_ID || "nmvA11Y688M5reLqDsVm";
const HIGH_LATENCY_MS = 2500;
const TRANSCRIPT_GROUP_MS = 1800;

const SPEED_OPTIONS: { label: string; value: number }[] = [
  { label: "🐢 Lenta", value: 0.8 },
  { label: "Media", value: 0.9 },
  { label: "Normal", value: 1.0 },
];

interface PracticePanelProps {
  targetPhrase?: string | null;
  targetEnglish?: string | null;
  targetDifficulty?: string | null;
}

export function PracticePanel({ targetPhrase, targetEnglish, targetDifficulty }: PracticePanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [turns, setTurns] = useState<TurnMetric[]>([]);
  const [interruptions, setInterruptions] = useState(0);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [speechSpeed, setSpeechSpeed] = useState(0.9);

  const vapiRef = useRef<Vapi | null>(null);
  const lastUserFinalAt = useRef<number | null>(null);
  const assistantSpeaking = useRef(false);
  const lastFinalAt = useRef<number | null>(null);
  const lastFinalRole = useRef<"user" | "assistant" | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const configured = Boolean(PUBLIC_KEY && ASSISTANT_ID);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const resetMetrics = () => {
    setTranscript([]);
    setTurns([]);
    setInterruptions(0);
    setLastLatency(null);
    setError(null);
    lastUserFinalAt.current = null;
    assistantSpeaking.current = false;
    lastFinalAt.current = null;
    lastFinalRole.current = null;
  };

  const wireEvents = useCallback((vapi: Vapi) => {
    vapi.on("call-start", () => setStatus("active"));
    vapi.on("call-end", () => {
      setStatus("ended");
      assistantSpeaking.current = false;
    });
    vapi.on("error", (e: any) => {
      console.error("[vapi] error", e);
      setError(e?.errorMsg || e?.message || "Call error");
      setStatus("ended");
    });
    vapi.on("speech-start", () => {
      assistantSpeaking.current = true;
      if (lastUserFinalAt.current != null) {
        const latency = Date.now() - lastUserFinalAt.current;
        setLastLatency(latency);
        setTurns((prev) => [...prev, { latencyMs: latency }]);
        lastUserFinalAt.current = null;
      }
    });
    vapi.on("speech-end", () => {
      assistantSpeaking.current = false;
    });
    vapi.on("volume-level", (v: number) => setVolume(v));
    vapi.on("message", (msg: any) => {
      if (msg?.type !== "transcript") return;
      const role: "user" | "assistant" = msg.role === "assistant" ? "assistant" : "user";

      if (msg.transcriptType === "final") {
        const text = (msg.transcript || "").trim();
        if (!text) return;
        const now = Date.now();
        const continuation =
          lastFinalRole.current === role &&
          lastFinalAt.current != null &&
          now - lastFinalAt.current < TRANSCRIPT_GROUP_MS;

        setTranscript((prev) => {
          if (continuation && prev.length > 0) {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, text: `${last.text} ${text}`.trim() };
            return updated;
          }
          return [...prev, { role, text }];
        });

        if (role === "user") {
          lastUserFinalAt.current = now;
          if (assistantSpeaking.current && !continuation) {
            setInterruptions((n) => n + 1);
          }
        }
        lastFinalAt.current = now;
        lastFinalRole.current = role;
      }
    });
  }, []);

  const startCall = async () => {
    if (!configured) return;
    resetMetrics();
    setStatus("connecting");
    try {
      const vapi = new Vapi(PUBLIC_KEY!);
      vapiRef.current = vapi;
      wireEvents(vapi);
      const overrides: Record<string, any> = {
        voice: {
          provider: "11labs",
          voiceId: VOICE_ID,
          model: "eleven_turbo_v2_5",
          language: "es",
          stability: 0.6,
          similarityBoost: 0.75,
          speed: speechSpeed,
        },
        variableValues: {
          topicLine: buildTopicLine(
            targetPhrase ?? undefined,
            targetEnglish ?? undefined,
            targetDifficulty ?? undefined
          ),
        },
      };
      if (targetPhrase) {
        overrides.firstMessage = buildPhraseFirstMessage(targetPhrase);
      }
      await vapi.start(ASSISTANT_ID!, overrides);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not start the call");
      setStatus("ended");
    }
  };

  const stopCall = () => {
    setStatus("ending");
    vapiRef.current?.stop();
  };

  // stop any live call if the panel unmounts (e.g. the sheet closes)
  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  const avgLatency =
    turns.length > 0
      ? Math.round(turns.reduce((a, t) => a + t.latencyMs, 0) / turns.length)
      : null;

  const isLive = status === "active" || status === "connecting" || status === "ending";

  return (
    <div className="flex h-full flex-col gap-3 rounded-l-3xl border-l border-white/60 bg-white/80 p-6 text-black backdrop-blur-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-black">Práctica de voz</h2>
        <p className="text-sm text-slate-700">Live Spanish conversation practice</p>
      </div>

      {targetPhrase && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
            Practicando esta frase
          </div>
          <div className="mt-0.5 text-xl font-bold text-emerald-900">«{targetPhrase}»</div>
          {targetEnglish && <div className="text-sm text-emerald-800">{targetEnglish}</div>}
        </div>
      )}

      {!configured && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50/80 p-3 text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">
            Vapi not configured — add <code>NEXT_PUBLIC_VAPI_PUBLIC_KEY</code> and{" "}
            <code>NEXT_PUBLIC_VAPI_ASSISTANT_ID</code> to <code>.env.local</code>.
          </p>
        </div>
      )}

      {/* metrics */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Last turn" value={lastLatency != null ? `${lastLatency} ms` : "—"} highlight={lastLatency != null && lastLatency > HIGH_LATENCY_MS} />
        <Metric label="Avg latency" value={avgLatency != null ? `${avgLatency} ms` : "—"} />
        <Metric label="Turns" value={String(turns.length)} />
        <Metric label="Interruptions" value={String(interruptions)} highlight={interruptions > 0} />
      </div>

      {/* call control */}
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 bg-white/80 transition-all"
          style={{
            borderColor: status === "active" ? "#10b981" : "#94a3b8",
            boxShadow:
              status === "active"
                ? `0 0 ${10 + volume * 40}px ${2 + volume * 10}px rgba(16,185,129,0.45)`
                : "none",
          }}
        >
          {status === "connecting" || status === "ending" ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          ) : (
            <Mic className={`h-5 w-5 ${status === "active" ? "text-emerald-500" : "text-slate-500"}`} />
          )}
        </div>

        <div className="text-center text-sm font-medium text-slate-700">
          {status === "idle" && "Tap to start a Spanish conversation"}
          {status === "connecting" && "Connecting…"}
          {status === "active" && "Listening — habla en español"}
          {status === "ending" && "Ending…"}
          {status === "ended" && "Call ended"}
        </div>

        {/* speed selector */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white/90 p-1">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSpeechSpeed(opt.value)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  speechSpeed === opt.value
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600 hover:text-black"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            Velocidad de voz{status === "active" ? " · applies next session" : ""}
          </span>
        </div>

        {!isLive ? (
          <Button onClick={startCall} disabled={!configured} className="bg-emerald-500 px-6 text-white hover:bg-emerald-600">
            <Mic className="mr-2 h-4 w-4" />
            {status === "ended" ? "Start again" : "Start session"}
          </Button>
        ) : (
          <Button onClick={stopCall} variant="destructive" className="px-6" disabled={status === "connecting"}>
            <PhoneOff className="mr-2 h-4 w-4" />
            End call
          </Button>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* transcript */}
      <div className="flex min-h-0 flex-1 flex-col">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Transcript</h3>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-white/70 bg-white/65 p-4 text-base">
          {transcript.length === 0 ? (
            <p className="text-sm text-slate-500">The conversation will appear here…</p>
          ) : (
            transcript.map((line, i) => (
              <div key={i} className={`flex ${line.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-base shadow-sm ${
                    line.role === "user"
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-black"
                  }`}
                >
                  {line.text}
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-2.5 ${highlight ? "border-amber-300 bg-amber-50/80" : "border-white/70 bg-white/70"}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-600">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${highlight ? "text-amber-600" : "text-black"}`}>{value}</div>
    </div>
  );
}
