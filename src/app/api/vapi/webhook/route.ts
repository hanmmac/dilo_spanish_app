import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Vapi posts call events here. I mostly care about end-of-call-report — that's
// the full transcript + timing I pull latency and failure flags out of.
// status-update just lets me create the session row while the call's still live.
// Same path for web and phone calls, which is how the dashboard compares them.

const HIGH_LATENCY_MS = 2500; // a turn slower than this feels laggy on a call

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-vapi-secret");
  if (
    process.env.VAPI_WEBHOOK_SECRET &&
    secret !== process.env.VAPI_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "invalid secret" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const message = body?.message;
  const type = message?.type;
  const call = message?.call;
  const callId: string | undefined = call?.id;

  if (!callId) {
    // not tied to a call (e.g. assistant-request) — nothing to save
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabaseAdmin();
  const transport = inferTransport(call);

  try {
    if (type === "status-update") {
      await supabase.from("voice_sessions").upsert(
        {
          vapi_call_id: callId,
          transport,
          status: message?.status === "ended" ? "ended" : "active",
        },
        { onConflict: "vapi_call_id" }
      );
      return NextResponse.json({ received: true });
    }

    if (type === "end-of-call-report") {
      await persistEndOfCall(supabase, callId, transport, message);
      return NextResponse.json({ received: true });
    }

    // ack everything else so Vapi doesn't keep retrying
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[vapi webhook] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

function inferTransport(call: any): "web" | "phone" {
  const t = call?.type || "";
  if (typeof t === "string" && t.toLowerCase().includes("phone")) return "phone";
  return "web";
}

interface ParsedTurn {
  turn_index: number;
  user_text: string | null;
  assistant_text: string | null;
  latency_ms: number | null;
  was_interrupted: boolean;
  flags: string[];
}

// Rebuild turns from the transcript. Each message has secondsFromStart (+ usually
// duration), so I pair a user line with the agent reply after it and measure the
// gap from "user stopped talking" to "agent started" — that's the per-turn latency.
function parseTurns(messages: any[]): ParsedTurn[] {
  const turns: ParsedTurn[] = [];
  let pendingUser: { text: string; endSec: number } | null = null;
  let index = 0;

  const roleOf = (m: any): "user" | "assistant" | "other" => {
    const r = (m?.role || "").toLowerCase();
    if (r === "user") return "user";
    if (r === "bot" || r === "assistant") return "assistant";
    return "other";
  };

  for (const m of messages) {
    const role = roleOf(m);
    if (role === "other") continue;

    const text: string = (m?.message ?? m?.content ?? "").toString().trim();
    const startSec: number | undefined =
      typeof m?.secondsFromStart === "number" ? m.secondsFromStart : undefined;
    const durationSec: number =
      typeof m?.duration === "number"
        ? m.duration / (m.duration > 100 ? 1000 : 1) // duration may be ms or s
        : 0;

    if (role === "user") {
      pendingUser = {
        text,
        endSec: (startSec ?? 0) + durationSec,
      };
      continue;
    }

    // assistant turn
    const flags: string[] = [];
    let latencyMs: number | null = null;

    if (pendingUser && typeof startSec === "number") {
      latencyMs = Math.round(Math.max(0, (startSec - pendingUser.endSec) * 1000));
      if (latencyMs > HIGH_LATENCY_MS) flags.push("high_latency");
    }

    const userText = pendingUser?.text ?? null;
    if (pendingUser && (!userText || userText.length === 0)) {
      flags.push("empty_transcript");
    }

    const wasInterrupted = Boolean(m?.interrupted || m?.endedReason === "interrupted");
    if (wasInterrupted) flags.push("interrupted");

    turns.push({
      turn_index: index++,
      user_text: userText,
      assistant_text: text || null,
      latency_ms: latencyMs,
      was_interrupted: wasInterrupted,
      flags,
    });
    pendingUser = null;
  }

  return turns;
}

function percentile(values: number[], p: number): number | null {
  const xs = values.filter((v) => typeof v === "number").sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const idx = Math.min(xs.length - 1, Math.floor((p / 100) * xs.length));
  return xs[idx];
}

async function persistEndOfCall(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  callId: string,
  transport: "web" | "phone",
  message: any
) {
  // Vapi puts the transcript in different spots depending on version
  const messages: any[] =
    message?.artifact?.messages ||
    message?.messages ||
    message?.artifact?.messagesOpenAIFormatted ||
    [];

  const turns = parseTurns(messages);
  const latencies = turns
    .map((t) => t.latency_ms)
    .filter((v): v is number => typeof v === "number");
  const interruptionCount = turns.filter((t) => t.was_interrupted).length;

  const durationMs =
    typeof message?.durationMs === "number"
      ? message.durationMs
      : typeof message?.durationSeconds === "number"
      ? Math.round(message.durationSeconds * 1000)
      : null;

  const { data: session, error: sErr } = await supabase
    .from("voice_sessions")
    .upsert(
      {
        vapi_call_id: callId,
        transport,
        status: "ended",
        ended_at: new Date().toISOString(),
        duration_ms: durationMs,
        turn_count: turns.length,
        interruption_count: interruptionCount,
        avg_latency_ms: latencies.length
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : null,
        p95_latency_ms: percentile(latencies, 95),
        ended_reason: message?.endedReason ?? null,
        report: {
          recordingUrl: message?.recordingUrl ?? message?.artifact?.recordingUrl ?? null,
          summary: message?.summary ?? message?.analysis?.summary ?? null,
          cost: message?.cost ?? null,
          endedReason: message?.endedReason ?? null,
          durationSeconds: message?.durationSeconds ?? null,
        },
      },
      { onConflict: "vapi_call_id" }
    )
    .select("id")
    .single();

  if (sErr) throw sErr;
  const sessionId = session.id;

  if (turns.length === 0) return;

  // Vapi can resend the report, so wipe and re-insert instead of duplicating
  await supabase.from("voice_turns").delete().eq("session_id", sessionId);

  const rows = turns.map((t) => ({
    session_id: sessionId,
    vapi_call_id: callId,
    turn_index: t.turn_index,
    user_text: t.user_text,
    assistant_text: t.assistant_text,
    latency_ms: t.latency_ms,
    was_interrupted: t.was_interrupted,
    flags: t.flags,
  }));

  const { error: tErr } = await supabase.from("voice_turns").insert(rows);
  if (tErr) throw tErr;
}
