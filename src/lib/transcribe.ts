import { supabase } from "@/integrations/supabase/client";

// Whisper invents these on silence or noise; never send them as if the user said them.
const HALLUCINATIONS = /^(obrigad[oa]\.?|legendas? .*|thank you\.?|thanks for watching.*|gracias\.?|merci\.?|danke\.?|grazie\.?|\.+|tchau\.?)$/i;

export async function transcribe(audio: Blob, lang: string): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const form = new FormData();
    form.append("audio", audio, audio.type.includes("webm") ? "a.webm" : "a.m4a");
    form.append("lang", lang.slice(0, 2));
    const r = await fetch("/api/stt", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: form });
    if (!r.ok) return "";
    const { text } = (await r.json()) as { text?: string };
    const clean = (text ?? "").trim();
    return HALLUCINATIONS.test(clean) ? "" : clean;
  } catch { return ""; }
}
