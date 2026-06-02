import { NextRequest, NextResponse } from "next/server";
import { buildTutorSystemPrompt, TUTOR_FIRST_MESSAGE } from "@/lib/voice/prompt";

// Configures the Vapi assistant from code so I'm not re-clicking the dashboard
// every time I tweak the prompt or a setting. POST once the env vars are set:
//   curl -X POST "http://localhost:3000/api/vapi/setup?serverUrl=https://<tunnel>/api/vapi/webhook"
// Query params: serverUrl (webhook), voiceId, region, formality.

export async function POST(req: NextRequest) {
  const privateKey = process.env.VAPI_PRIVATE_KEY;
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;

  if (!privateKey || !assistantId) {
    return NextResponse.json(
      { error: "Set VAPI_PRIVATE_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID in .env.local" },
      { status: 400 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const serverUrl = sp.get("serverUrl") || undefined;
  const voiceId = sp.get("voiceId") || undefined;
  const region = sp.get("region") || "costa-rica";
  const formality = (sp.get("formality") as any) || "informal";

  const payload: Record<string, any> = {
    firstMessage: TUTOR_FIRST_MESSAGE,
    // haiku is fast and its Spanish is plenty good for a voice loop
    model: {
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      messages: [
        { role: "system", content: buildTutorSystemPrompt({ region, formality }) },
      ],
    },
    // tried deepgram and gpt-4o-transcribe first; speechmatics handled my
    // accent best while still streaming. notes in TUNING_LOG.md
    transcriber: {
      provider: "speechmatics",
      language: "es",
    },
    silenceTimeoutSeconds: 60, // give a learner time to think before hanging up
    // wait out a pause before responding so it doesn't talk over me mid-sentence
    startSpeakingPlan: {
      waitSeconds: 0.6,
      transcriptionEndpointingPlan: {
        onPunctuationSeconds: 0.3,
        onNoPunctuationSeconds: 3.0,
        onNumberSeconds: 0.8,
      },
    },
    // but let me cut in quickly, otherwise my first words get clipped
    stopSpeakingPlan: {
      numWords: 2,
      voiceSeconds: 0.3,
      backoffSeconds: 1.5,
    },
  };

  if (voiceId) {
    // steadier and a touch slower for a learner
    payload.voice = {
      provider: "11labs",
      voiceId,
      model: "eleven_turbo_v2_5",
      language: "es",
      stability: 0.6,
      similarityBoost: 0.75,
      speed: 0.95,
    };
  }
  if (serverUrl) {
    payload.server = { url: serverUrl, secret: webhookSecret };
  }

  const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${privateKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: "Vapi rejected the update", status: res.status, detail: data },
      { status: res.status }
    );
  }

  return NextResponse.json({
    ok: true,
    assistantId,
    applied: {
      firstMessage: payload.firstMessage,
      model: payload.model.model,
      transcriber: `${payload.transcriber.provider}${payload.transcriber.model ? " " + payload.transcriber.model : ""} (${payload.transcriber.language})`,
      voiceSet: Boolean(voiceId),
      serverUrl: serverUrl ?? "(unchanged)",
    },
  });
}
