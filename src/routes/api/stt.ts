import { createFileRoute } from "@tanstack/react-router";
import { userClient } from "@/lib/ai/chat.server";

// Speech-to-text for phones without reliable in-browser recognition. Uses the owner's Groq key.
export const Route = createFileRoute("/api/stt")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
        if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });
        const { data: u } = await userClient(token).auth.getUser(token);
        if (!u.user) return new Response("Unauthorized", { status: 401 });
        const form = await request.formData();
        const audio = form.get("audio");
        const lang = String(form.get("lang") ?? "pt").slice(0, 2);
        if (!(audio instanceof Blob) || audio.size < 1000) return Response.json({ text: "" });
        if (audio.size > 8_000_000) return new Response("Too large", { status: 413 });
        const key = process.env["GROQ_API_KEY"];
        if (!key) return new Response("Unavailable", { status: 503 });
        const out = new FormData();
        const ext = audio.type.includes("webm") ? "webm" : "m4a";
        out.append("file", audio, `speech.${ext}`);
        out.append("model", "whisper-large-v3-turbo");
        if (/^(pt|en|es|fr|de|it)$/.test(lang)) out.append("language", lang);
        out.append("response_format", "json");
        const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: out });
        if (!r.ok) { console.error("stt failed", r.status, (await r.text()).slice(0, 300)); return new Response("Failed", { status: 502 }); }
        const { text } = (await r.json()) as { text?: string };
        return Response.json({ text: (text ?? "").trim() });
      },
    },
  },
});
