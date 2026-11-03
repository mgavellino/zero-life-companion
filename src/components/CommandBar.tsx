import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mic, Send, Square } from "lucide-react";
import { toast } from "sonner";
import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { customerText } from "@/lib/chat-presentation";
import { Button } from "./ui/button";

const L = (pt: string, en: string) => (i18n.language?.startsWith("pt") ? pt : en);

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

async function threadId() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("auth");
  const { data } = await supabase.from("threads").select("id").eq("user_id", u.user.id).order("created_at").limit(1);
  if (data?.[0]?.id) return data[0].id as string;
  const { data: n, error } = await supabase.from("threads").insert({ title: "Zero", user_id: u.user.id }).select("id").single();
  if (error) throw error;
  return n.id as string;
}

/** Single text field + mic present on every tab. Voice is recorded and transcribed server-side (Whisper). */
export function CommandBar() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState(false);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const input = useRef<HTMLInputElement>(null);
  // Home-screen shortcuts open with ?quick=1: focus the bar so the user can type right away.
  useEffect(() => { if (new URLSearchParams(location.search).has("quick")) input.current?.focus(); }, []);

  async function send(value: string) {
    const msg = value.trim();
    if (!msg || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ threadId: await threadId(), lang: i18n.language, messages: [{ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: msg }] }] }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", out = "";
      for (;;) {
        const { done, value: v } = await reader.read();
        if (done) break;
        buf += dec.decode(v, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          try { const e = JSON.parse(l.slice(5)); if (e.type === "text-delta" && e.delta) out += e.delta; } catch { /* ignore */ }
        }
      }
      const clean = customerText(out).replace(/[*#_`>]/g, "").trim();
      toast.success(clean || L("Feito!", "Done!"), { duration: 7000 });
      setText("");
      qc.invalidateQueries();
    } catch {
      toast.error(L("Não consegui agora. Tente de novo.", "Couldn't do it now. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleMic() {
    if (rec) { mr.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported?.(t));
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRec(false);
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        setBusy(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "speech");
          fd.append("lang", (i18n.language || "pt").slice(0, 2));
          const res = await fetch("/api/stt", { method: "POST", headers: { Authorization: `Bearer ${await token()}` }, body: fd });
          const { text: heard } = (await res.json()) as { text?: string };
          setBusy(false);
          if (heard) { setText(heard); await send(heard); }
          else toast.error(L("Não ouvi nada. Fale de novo.", "I didn't hear anything."));
        } catch {
          setBusy(false);
          toast.error(L("Falha ao transcrever.", "Transcription failed."));
        }
      };
      mr.current = r;
      r.start();
      setRec(true);
    } catch {
      toast.error(L("Permita o microfone nas configurações.", "Allow microphone access."));
    }
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void send(text); }}
      data-command-bar
      className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-t bg-background px-3 py-2"
    >
      <input
        ref={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy || rec}
        placeholder={rec ? L("Ouvindo… toque para parar", "Listening… tap to stop") : L("Ex.: gastei 25 no almoço", "e.g. spent 25 on lunch")}
        className="h-11 w-full min-w-0 rounded-full border bg-card px-4 text-base outline-none focus:ring-2 focus:ring-ring"
      />
      <Button type="button" size="icon" variant={rec ? "destructive" : "secondary"} className="size-11 rounded-full" onClick={toggleMic} disabled={busy} aria-label="Microfone">
        {rec ? <Square className="size-4 animate-pulse" /> : <Mic className="size-5" />}
      </Button>
      <Button type="submit" size="icon" className="size-11 rounded-full" disabled={busy || rec || !text.trim()} aria-label="Enviar">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
      </Button>
    </form>
  );
}
