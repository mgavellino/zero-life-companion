import { supabase } from "@/integrations/supabase/client";

const LOCALES: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT" };
let current: HTMLAudioElement | null = null;

export function stopSpeaking() {
  current?.pause();
  current = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

function browserSpeak(text: string, lang: string) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LOCALES[lang] ?? "pt-BR";
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

/** Speaks with the premium voice when the plan allows, otherwise the browser voice. Resolves when done. */
export async function speak(text: string, lang: string): Promise<"premium" | "basic"> {
  stopSpeaking();
  if (!text.trim()) return "basic";
  try {
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ text }),
    });
    if (r.ok) {
      const url = URL.createObjectURL(await r.blob());
      const a = new Audio(url);
      current = a;
      await new Promise<void>((resolve) => {
        a.onended = () => resolve();
        a.onerror = () => resolve();
        a.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);
      return "premium";
    }
  } catch {
    /* fall through to browser voice */
  }
  await browserSpeak(text, lang);
  return "basic";
}
