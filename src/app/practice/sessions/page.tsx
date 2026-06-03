import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Phone, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

const HIGH_LATENCY_MS = 2500;

interface SessionRow {
  id: string;
  vapi_call_id: string;
  transport: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  turn_count: number;
  interruption_count: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  ended_reason: string | null;
}

interface TurnRow {
  turn_index: number;
  user_text: string | null;
  assistant_text: string | null;
  latency_ms: number | null;
  was_interrupted: boolean;
  flags: string[];
}

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

async function getData() {
  const supabase = getClient();
  const { data: sessions } = await supabase
    .from("voice_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  const list = (sessions || []) as SessionRow[];
  const latest = list.find((s) => s.turn_count > 0) || list[0];

  let turns: TurnRow[] = [];
  if (latest) {
    const { data } = await supabase
      .from("voice_turns")
      .select("*")
      .eq("session_id", latest.id)
      .order("turn_index", { ascending: true });
    turns = (data || []) as TurnRow[];
  }

  return { list, latest, turns };
}

function avg(nums: number[]): number | null {
  const xs = nums.filter((n) => typeof n === "number");
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

export default async function SessionsPage() {
  const { list, latest, turns } = await getData();

  const webAvg = avg(
    list.filter((s) => s.transport === "web" && s.avg_latency_ms != null).map((s) => s.avg_latency_ms!)
  );
  const phoneAvg = avg(
    list.filter((s) => s.transport === "phone" && s.avg_latency_ms != null).map((s) => s.avg_latency_ms!)
  );
  const totalTurns = list.reduce((a, s) => a + s.turn_count, 0);
  const totalInterruptions = list.reduce((a, s) => a + s.interruption_count, 0);
  const maxLatency = Math.max(1, ...turns.map((t) => t.latency_ms || 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to practice
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight">Voice agent observability</h1>
        <p className="text-sm text-slate-400">
          Per-call latency, interruptions, and failure flags across {list.length} session
          {list.length === 1 ? "" : "s"}.
        </p>

        {/* aggregate cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="Sessions" value={String(list.length)} />
          <Card label="Total turns" value={String(totalTurns)} />
          <Card label="Interruptions" value={String(totalInterruptions)} highlight={totalInterruptions > 0} />
          <Card
            label="Web vs phone avg"
            value={`${webAvg ?? "—"} / ${phoneAvg ?? "—"} ms`}
            sub="latency per turn"
          />
        </div>

        {/* latest session turn-by-turn */}
        {latest && turns.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Latest call — turn-by-turn latency
              </h2>
              <TransportBadge transport={latest.transport} />
            </div>

            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              {turns.map((t) => {
                const slow = (t.latency_ms || 0) > HIGH_LATENCY_MS;
                const pct = Math.round(((t.latency_ms || 0) / maxLatency) * 100);
                return (
                  <div key={t.turn_index} className="text-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-8 shrink-0 text-xs text-slate-600">#{t.turn_index}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-slate-800">
                        <div
                          className={`h-full ${slow ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`w-16 shrink-0 text-right text-xs ${slow ? "text-amber-400" : "text-slate-400"}`}>
                        {t.latency_ms != null ? `${t.latency_ms} ms` : "—"}
                      </span>
                    </div>
                    <div className="ml-11 mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {t.user_text && <span className="text-slate-400">🗣 {t.user_text}</span>}
                      {t.flags?.map((f) => (
                        <span key={f} className="rounded bg-amber-950/60 px-1.5 py-0.5 text-amber-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* all sessions table */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">All sessions</h2>
          {list.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
              No sessions yet. Start a call on the{" "}
              <Link href="/practice" className="underline">practice page</Link>, then refresh.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Transport</th>
                    <th className="px-3 py-2 text-right">Turns</th>
                    <th className="px-3 py-2 text-right">Avg</th>
                    <th className="px-3 py-2 text-right">p95</th>
                    <th className="px-3 py-2 text-right">Interrupts</th>
                    <th className="px-3 py-2">Ended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {list.map((s) => (
                    <tr key={s.id} className="bg-slate-900/30">
                      <td className="px-3 py-2 text-slate-400">
                        {new Date(s.started_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2"><TransportBadge transport={s.transport} /></td>
                      <td className="px-3 py-2 text-right">{s.turn_count}</td>
                      <td className="px-3 py-2 text-right">{s.avg_latency_ms ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{s.p95_latency_ms ?? "—"}</td>
                      <td className={`px-3 py-2 text-right ${s.interruption_count > 0 ? "text-amber-400" : ""}`}>
                        {s.interruption_count}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{s.ended_reason ?? s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-amber-600/60 bg-amber-950/30" : "border-slate-800 bg-slate-900/60"}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${highlight ? "text-amber-300" : "text-slate-100"}`}>{value}</div>
      {sub && <div className="text-xs text-slate-600">{sub}</div>}
    </div>
  );
}

function TransportBadge({ transport }: { transport: string }) {
  const isPhone = transport === "phone";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
        isPhone ? "bg-sky-950/60 text-sky-300" : "bg-violet-950/60 text-violet-300"
      }`}
    >
      {isPhone ? <Phone className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
      {isPhone ? "phone" : "web"}
    </span>
  );
}
