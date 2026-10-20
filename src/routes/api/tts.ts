import { createFileRoute } from "@tanstack/react-router";
import { userClient } from "@/lib/ai/chat.server";

// Premium voice (ElevenLabs) for Pro/Max subscribers and trial users.
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah — warm, multilingual

export const Route = createFileRoute("/api/tts")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
        if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });
        const sb = userClient(token);
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return new Response("Unauthorized", { status: 401 });

        const { getUserPlan } = await import("@/lib/plan.server");
        const plan = await getUserPlan(sb, u.user.id);
        const premium = plan === "pro" || plan === "max";
        if (!premium) return new Response("UPGRADE", { status: 402 });

        const { text } = (await request.json()) as { text?: string };
        const clean = (text ?? "").slice(0, 2500).trim();
        if (!clean) return new Response("Empty", { status: 400 });

        const key = process.env["ELEVENLABS_API_KEY"];
        if (!key) return new Response("Voice not configured", { status: 503 });
        const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=mp3_44100_128`, {
          method: "POST",
          headers: { "xi-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true } }),
        });
        if (!r.ok || !r.body) {
          const err = await r.text();
          console.error(`ElevenLabs failed [${r.status}]: ${err}`);
          return new Response(`Voice failed [${r.status}]`, { status: 502 });
        }
        return new Response(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
      },
    },
  },
});
