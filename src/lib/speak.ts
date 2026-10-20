import { readVoicePrefs } from "./voice-prefs";
import { supabase } from "@/integrations/supabase/client";

const LOCALES: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT" };
// One reusable audio element: phones only allow sound from an element that was first started by a tap.
let player: HTMLAudioElement | null = null;
let unlocked = false;
let token = 0;
const SILENT = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

function getPlayer() {
  if (!player) { player = new Audio(); player.setAttribute("playsinline", ""); player.preload = "auto"; }
  return player;
}

/** Call from a tap (mic button, voice mode). Unlocks sound so replies can be spoken later without another tap. */
export function unlockAudio() {
  if (typeof window === "undefined" || unlocked) return;
  unlocked = true;
  try {
    const a = getPlayer();
    a.src = SILENT;
    a.muted = true;
    void a.play().then(() => { a.pause(); a.muted = false; }).catch(() => { a.muted = false; unlocked = false; });
  } catch { unlocked = false; }
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis?.speak(u);
  } catch { /* no browser voice */ }
}

export function stopSpeaking() {
  token++;
  if (player) { player.pause(); player.removeAttribute("src"); player.load(); }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

function pickVoice(locale: string) {
  const voices = window.speechSynthesis.getVoices();
  const lang = locale.slice(0, 2);
  return voices.find((v) => v.lang === locale && /google|natural|premium|enhanced|luciana|felipe/i.test(v.name))
    ?? voices.find((v) => v.lang === locale)
    ?? voices.find((v) => v.lang.startsWith(lang));
}

function waitForVoices() {
  return new Promise<void>((resolve) => {
    if (window.speechSynthesis.getVoices().length) return resolve();
    const done = () => resolve();
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 800);
  });
}

/** Browser voice, split into sentences because some browsers cut long speech after ~15 seconds. */
async function browserSpeak(text: string, lang: string, my: number) {
  if (!("speechSynthesis" in window)) return;
  await waitForVoices();
  const locale = LOCALES[lang] ?? "pt-BR";
  const voice = pickVoice(locale);
  const parts = text.match(/[^.!?…\n]+[.!?…]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  window.speechSynthesis.cancel();
  for (const part of parts) {
    if (my !== token) return;
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = locale;
      if (voice) u.voice = voice;
      u.rate = 1.05;
      const guard = setTimeout(resolve, Math.max(4000, part.length * 120));
      u.onend = () => { clearTimeout(guard); resolve(); };
      u.onerror = () => { clearTimeout(guard); resolve(); };
      window.speechSynthesis.speak(u);
      // Chrome can stay paused after a cancel; nudge it.
      window.speechSynthesis.resume();
    });
  }
}

/** Speaks with the premium voice when the plan allows, otherwise the browser voice. Resolves when done. */
export async function speak(text: string, lang: string): Promise<"premium" | "basic"> {
  stopSpeaking();
  const my = token;
  if (!text.trim()) return "basic";
  try {
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ text, voiceId: readVoicePrefs().voice }),
    });
    if (r.ok && my === token) {
      const url = URL.createObjectURL(await r.blob());
      const a = getPlayer();
      a.src = url;
      const played = await new Promise<boolean>((resolve) => {
        a.onended = () => resolve(true);
        a.onerror = () => resolve(false);
        a.play().catch(() => resolve(false));
      });
      URL.revokeObjectURL(url);
      if (played || my !== token) return "premium";
    }
  } catch {
    /* fall through to browser voice */
  }
  if (my === token) await browserSpeak(text, lang, my);
  return "basic";
}
