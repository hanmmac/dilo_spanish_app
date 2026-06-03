import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// The browser measures per-turn latency directly (user speech-end -> agent audio
// start), which is far more accurate than reconstructing it from Vapi's end-of-call
// report — especially with Speechmatics, which fragments the transcript. So for web
// calls the client POSTs its measured turns here and this is the source of truth.

const HIGH_LATENCY_MS = 2500;

interface ClientLine {
  role: "user" | "assistant";
  text: string;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const callId: string | undefined = body?.callId;
  if (!callId) return NextResponse.json({ error: "missing callId" }, { status: 400 });

  const transcript: ClientLine[] = Array.isArray(body?.transcript) ? body.transcript : [];
  const latencies: number[] = Array.isArray(body?.latencies)
    ? body.latencies.filter((n: any) => typeof n === "number")
    : [];
  const durationMs: number | null = typeof body?.durationMs === "number" ? body.durationMs : null;
  const interruptions: number = typeof body?.interruptions === "number" ? body.interruptions : 0;

  // pair each user line with the assistant reply after it, in order, and attach the
  // latency that was measured for that turn
  const turns: {
    turn_index: number;
    user_text: string | null;
    assistant_text: string | null;
    latency_ms: number | null;
    flags: string[];
  }[] = [];
  let pendingUser: string | null = null;
  let li = 0;
  for (const line of transcript) {
    if (line.role === "user") {
      pendingUser = line.text;
    } else if (pendingUser != null) {
      const latency = li < latencies.length ? latencies[li++] : null;
      const flags: string[] = [];
      if (latency != null && latency > HIGH_LATENCY_MS) flags.push("high_latency");
      turns.push({
        turn_index: turns.length,
        user_text: pendingUser,
        assistant_text: line.text,
        latency_ms: latency,
        flags,
      });
      pendingUser = null;
    }
  }

  const used = turns.map((t) => t.latency_ms).filter((v): v is number => v != null).sort((a, b) => a - b);
  const avg = used.length ? Math.round(used.reduce((a, b) => a + b, 0) / used.length) : null;
  const p95 = used.length ? used[Math.min(used.length - 1, Math.floor(0.95 * used.length))] : null;

  const supabase = getSupabaseAdmin();
  const { data: session, error: sErr } = await supabase
    .from("voice_sessions")
    .upsert(
      {
        vapi_call_id: callId,
        transport: "web",
        status: "ended",
        ended_at: new Date().toISOString(),
        duration_ms: durationMs,
        turn_count: turns.length,
        interruption_count: interruptions,
        avg_latency_ms: avg,
        p95_latency_ms: p95,
        ended_reason: "client-measured",
      },
      { onConflict: "vapi_call_id" }
    )
    .select("id")
    .single();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  await supabase.from("voice_turns").delete().eq("session_id", session.id);
  if (turns.length) {
    const rows = turns.map((t) => ({
      session_id: session.id,
      vapi_call_id: callId,
      turn_index: t.turn_index,
      user_text: t.user_text,
      assistant_text: t.assistant_text,
      latency_ms: t.latency_ms,
      flags: t.flags,
    }));
    const { error: tErr } = await supabase.from("voice_turns").insert(rows);
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, turns: turns.length, avg, p95 });
}
