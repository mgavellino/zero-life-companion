import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Loader2, Mic, Send, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { quickCapture, type CaptureItem } from "@/lib/capture.functions";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/data";
import { cn } from "@/lib/utils";

type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; start: () => void; stop: () => void };

/** Tony-style capture: say or type one sentence, get confirmation cards with undo. */
export function QuickCapture({ className }: { className?: string }) {
  const run = useServerFn(quickCapture);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [items, setItems] = useState<CaptureItem[]>([]);
  const rec = useRef<SR | null>(null);

  async function submit(value = text) {
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      const r = await run({ data: { text: value, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
      if (!r.items.length) toast("Não encontrei gasto nem lembrete nessa frase.");
      setItems((prev) => [...r.items, ...prev].slice(0, 8));
      setText("");
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function undo(it: CaptureItem) {
    await supabase.from(it.type === "task" ? "tasks" : "transactions").delete().eq("id", it.id);
    setItems((p) => p.filter((x) => x.id !== it.id));
    qc.invalidateQueries();
  }

  function mic() {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) return toast.error("Seu navegador não suporta ditado.");
    if (listening) return rec.current?.stop();
    const r = new C();
    r.lang = "pt-BR";
    r.interimResults = false;
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setText(t);
      void submit(t);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }

  return (
    <div className={cn("rounded-3xl border bg-card p-4", className)}>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Button type="button" size="icon" variant={listening ? "default" : "outline"} className="shrink-0 rounded-full" onClick={mic} aria-label="Falar">
          <Mic className="size-4" />
        </Button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='"gastei 30 no almoço e me lembra da luz amanhã"'
          className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" size="icon" className="shrink-0 rounded-full" disabled={busy} aria-label="Registrar">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1">
              <span className="grid size-9 place-items-center rounded-full bg-background text-lg">{it.type === "task" ? <Bell className="size-4" /> : it.emoji}</span>
              <div className="min-w-0 flex-1">
                {it.type === "transaction" ? (
                  <>
                    <p className="truncate font-medium">{it.description ?? it.category}</p>
                    <p className="text-xs text-muted-foreground">{it.category} · {new Date(it.occurred_on + "T12:00").toLocaleDateString("pt-BR")}</p>
                  </>
                ) : (
                  <>
                    <p className="truncate font-medium">{it.title}</p>
                    <p className="text-xs text-muted-foreground">Lembrete {it.due_at ? new Date(it.due_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "sem data"}</p>
                  </>
                )}
              </div>
              {it.type === "transaction" && (
                <span className={cn("font-display font-semibold", it.kind === "income" ? "text-money" : "text-destructive")}>
                  {it.kind === "income" ? "+" : "−"}{money(it.amount)}
                </span>
              )}
              <button onClick={() => undo(it)} className="rounded-full p-1.5 text-muted-foreground hover:bg-background hover:text-foreground" aria-label="Desfazer">
                <Undo2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
