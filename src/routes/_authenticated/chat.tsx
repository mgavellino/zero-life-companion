import { DEFAULT_VOICE, orbColorValue, readVoicePrefs, type VoicePrefs } from "@/lib/voice-prefs";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Brain, CheckCircle2, Wallet, ListTodo, Salad, Target, Mic, MicOff, Volume2, VolumeX, Keyboard, AudioLines, Bell, Trash2, ListChecks, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { actionLabel, customerText, savedTransaction } from "@/lib/chat-presentation";
import { TransactionConfirmation } from "@/components/TransactionConfirmation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ZeroRing } from "@/components/Logo";
import { speak, stopSpeaking, unlockAudio } from "@/lib/speak";
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { useSubscription } from "@/hooks/use-subscription";
import { hasVoiceChat } from "@/lib/plans";
import { readChatHistory } from "@/lib/chat-history";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";

const chatQuery = {
  queryKey: ["chat"],
  queryFn: async (): Promise<{ threadId: string; messages: UIMessage[] }> => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error(i18n.t("chat2.authError"));
    const userId = auth.user.id;
    const { data: th, error: threadError } = await supabase.from("threads").select("id").eq("user_id", userId).order("created_at").limit(1);
    if (threadError) throw new Error(i18n.t("chat2.loadError"));
    let threadId = th?.[0]?.id;
    if (!threadId) {
      const { data, error } = await supabase.from("threads").insert({ title: "Zero", user_id: userId }).select("id").single();
      if (error) throw error;
      threadId = data.id;
    }
    const messages = await readChatHistory(async (from, to) => {
      const { data, error } = await supabase.from("messages").select("id,role,parts").eq("user_id", userId).eq("thread_id", threadId).order("created_at").order("id").range(from, to);
      if (error) throw new Error(i18n.t("chat2.messagesError"));
      return data;
    });
    return { threadId, messages };
  },
  staleTime: 0,
  refetchOnWindowFocus: false,
};

export const Route = createFileRoute("/_authenticated/chat")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: i18n.t("chat2.title") },
      { name: "description", content: i18n.t("chat2.description") },
      { property: "og:title", content: i18n.t("chat2.title") },
      { property: "og:description", content: i18n.t("chat2.description") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.fetchQuery(chatQuery),
  component: ChatPage,
});

const TOOL_ICONS: Record<string, typeof Brain> = { remember: Brain, add_task: ListTodo, add_transaction: Wallet, set_budget: Target, add_meal: Salad, notify: Bell };
const LOCALES: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT" };
const HIDDEN_TOOLS = new Set(["suggest_replies"]);

type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

function plainText(m: UIMessage) {
  return customerText(m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ")).replace(/[*#_`>|]/g, " ").replace(/\s+/g, " ").trim();
}

function quickReplies(m: UIMessage | undefined): string[] {
  if (!m || m.role !== "assistant") return [];
  for (const p of m.parts) {
    if (p.type === "tool-suggest_replies") {
      const o = (p as unknown as { output?: { options?: string[] } }).output;
      if (o?.options) return o.options.map(customerText).filter(Boolean);
    }
  }
  return [];
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

function ChatPage() {
  const { data: initial } = useSuspenseQuery(chatQuery);
  return <ChatConversation key={initial.threadId} initial={initial} />;
}

function ChatConversation({ initial }: { initial: { threadId: string; messages: UIMessage[] } }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const threadId = initial.threadId;
  const { plan, loading: subLoading } = useSubscription();
  const voiceAllowed = hasVoiceChat(plan);
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [orb, setOrb] = useState<VoicePrefs>({ voice: DEFAULT_VOICE, orbColor: "signal", orbStyle: "glow" });
  useEffect(() => { const sync = () => setOrb(readVoicePrefs()); sync(); window.addEventListener("zero-voice-prefs", sync); return () => window.removeEventListener("zero-voice-prefs", sync); }, []);
  useEffect(() => {
    if (!subLoading && !voiceAllowed) setMode("text");
  }, [subLoading, voiceAllowed]);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [handsFree, setHandsFree] = useState(false);
  const [speakText, setSpeakText] = useState(true);
  const handsFreeRef = useRef(false);
  handsFreeRef.current = handsFree;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const speakTextRef = useRef(speakText);
  speakTextRef.current = speakText;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SR | null>(null);
  const listenRef = useRef<() => void>(() => {});

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
        },
        body: () => ({ threadId, lang: i18n.language }),
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: threadId,
    messages: initial.messages,
    transport,
    onError: (e) => {
      const m = e.message || "";
      setVoice("idle");
      if (m.includes("LIMIT")) { setHandsFree(false); handsFreeRef.current = false; }
      if (m.includes("LIMIT")) toast.error(t("chat2.limit"), { action: { label: t("chat2.plans"), onClick: () => (window.location.href = "/planos") } });
      else toast.error(m.includes("429") ? t("chat2.rateError") : t("chat2.replyError"));
    },
    onFinish: async ({ message, messages: completedMessages }) => {
      qc.setQueryData(chatQuery.queryKey, { threadId, messages: completedMessages });
      void qc.invalidateQueries({ queryKey: chatQuery.queryKey, refetchType: "none" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "chat" });
      const shouldSpeak = modeRef.current === "voice" || speakTextRef.current;
      if (shouldSpeak) {
        setVoice("speaking");
        await speak(plainText(message), i18n.language);
      }
      setVoice("idle");
      if (modeRef.current !== "voice") inputRef.current?.focus();
    },
  });

  useEffect(() => () => stopSpeaking(), []);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Messages streamed in this session carry client ids; reload saved ids before selecting.
  async function startSelecting() {
    try {
      const fresh = await qc.fetchQuery(chatQuery);
      setMessages(fresh.messages);
      setSelected(new Set());
      setSelecting(true);
    } catch { toast.error(t("chat2.deleteError")); }
  }
  // Saves a readable text copy of the conversation (or only the selected messages) on this device.
  function exportConversation(onlySelected = false) {
    const list = onlySelected && selected.size ? messages.filter((m) => selected.has(m.id)) : messages;
    const lines = list.map((m) => `${m.role === "user" ? t("chat2.you") : t("chat2.zero")}:\n${plainText(m)}`).filter((l) => !l.endsWith(":\n"));
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zero-conversa-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success(t("chat2.exported"));
  }
  async function removeMessages(all: boolean) {
    setDeleting(true);
    try {
      const ids = [...selected];
      const query = supabase.from("messages").delete().eq("thread_id", threadId);
      const { error } = all ? await query : await query.in("id", ids);
      if (error) throw error;
      const remaining = all ? [] : messages.filter((m) => !selected.has(m.id));
      setMessages(remaining);
      qc.setQueryData(chatQuery.queryKey, { threadId, messages: remaining });
      setSelected(new Set());
      setSelecting(false);
      toast.success(t("chat2.deleted"));
    } catch { toast.error(t("chat2.deleteError")); }
    finally { setDeleting(false); }
  }
  const busy = status === "submitted" || status === "streaming";
  const send = useCallback(
    (v: string) => {
      if (!v.trim()) return;
      if (busy) { setVoice("idle"); return; }
      stopSpeaking();
      setVoice("thinking");
      sendMessage({ text: v });
      setText("");
    },
    [busy, sendMessage],
  );

  const manualStopRef = useRef(false);
  const listen = useCallback(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error(t("chat2.browserError"));
      setMode("text");
      return;
    }
    stopSpeaking();
    manualStopRef.current = false;
    // Text heard so far survives the browser's own restarts until we send it.
    let committed = "";
    let silence: ReturnType<typeof setTimeout> | undefined;
    let sent = false;
    let restarts = 0;
    const SILENCE_MS = 1800;
    const finish = () => {
      if (sent) return;
      const text = committed.trim();
      if (!text) return;
      sent = true;
      clearTimeout(silence);
      recRef.current?.stop();
      recRef.current = null;
      setInterim("");
      if (modeRef.current === "voice") send(text);
      else { setText(text); send(text); }
    };
    const start = () => {
      const rec = new Ctor();
      rec.lang = LOCALES[i18n.language] ?? "pt-BR";
      rec.interimResults = true;
      // Continuous keeps the mic open through short pauses; we decide when the sentence ended.
      rec.continuous = true;
      (rec as unknown as { maxAlternatives: number }).maxAlternatives = 1;
      let sessionFinal = "";
      rec.onresult = (e) => {
        let tmp = "";
        sessionFinal = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          const transcript = r?.[0]?.transcript;
          if (!r || !transcript) continue;
          if (r.isFinal) sessionFinal += transcript + " ";
          else tmp += transcript;
        }
        setInterim((committed + sessionFinal + tmp).trim());
        clearTimeout(silence);
        silence = setTimeout(() => { committed += sessionFinal + tmp; sessionFinal = ""; finish(); }, SILENCE_MS);
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") { manualStopRef.current = true; handsFreeRef.current = false; setHandsFree(false); toast.error(t("chat2.micError")); }
        else if (!["no-speech", "aborted", "network"].includes(e.error)) toast.error(t("chat2.hearingError"));
      };
      rec.onend = () => {
        committed += sessionFinal;
        if (sent) return;
        if (manualStopRef.current) {
          recRef.current = null;
          setInterim("");
          if (committed.trim()) finish(); else setVoice("idle");
          return;
        }
        // Browsers end recognition on their own after silence; reopen to stay continuous.
        if ((handsFreeRef.current && restarts++ < 200) || committed.trim()) {
          if (committed.trim()) { finish(); return; }
          setTimeout(() => { if (!manualStopRef.current && !sent) start(); }, 150);
          return;
        }
        recRef.current = null;
        setInterim("");
        if (committed.trim()) finish(); else setVoice("idle");
      };
      recRef.current = rec;
      try { rec.start(); } catch { /* already started */ }
    };
    setVoice("listening");
    start();
  }, [send, t]);
  listenRef.current = listen;

  // Hands-free loop: whenever the assistant is idle in voice mode, open the mic again.
  // This also recovers after errors, blocked sends or audio that never reported its end.
  useEffect(() => {
    if (mode !== "voice" || !handsFree || voice !== "idle" || busy || recRef.current) return;
    const id = setTimeout(() => { if (!recRef.current && handsFreeRef.current && modeRef.current === "voice") listenRef.current(); }, 450);
    return () => clearTimeout(id);
  }, [mode, handsFree, voice, busy]);

  function toggleVoice() {
    if (voice === "listening") {
      setHandsFree(false); handsFreeRef.current = false;
      manualStopRef.current = true;
      recRef.current?.stop();
      return;
    }
    if (voice === "speaking") {
      stopSpeaking();
      setVoice("idle");
      return;
    }
    if (voice === "thinking") return;
    unlockAudio();
    setHandsFree(true);
    handsFreeRef.current = true;
    listen();
  }

  useWebMCP({
    name: "read_conversation",
    description: "Read the latest messages shown in the Zero chat on this page.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => runWebMCPTool("read_conversation", () => {
      const recent = messages.slice(-20).map((m) => `${m.role === "user" ? "User" : "Zero"}: ${plainText(m)}`).filter((l) => !l.endsWith(": "));
      return recent.length ? recent.join("\n") : "The conversation is empty.";
    }),
  });
  useWebMCP({
    name: "draft_message",
    description: "Put text into the chat message box without sending it, switching to text mode.",
    inputSchema: { type: "object", properties: { text: { type: "string", description: "Message text to place in the box." } }, required: ["text"] },
    execute: ({ text: draft }: { text: string }) => runWebMCPTool("draft_message", () => {
      if (typeof draft !== "string" || !draft.trim()) throw new Error("Text is required.");
      if (draft.length > 4000) throw new Error("Text is too long.");
      setMode("text");
      setText(draft);
      return "Message placed in the box; the user can review and send it.";
    }),
  });

  const last = messages[messages.length - 1];
  const replies = !busy ? quickReplies(last) : [];
  const suggestions = t("suggestions", { returnObjects: true }) as string[];
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const voiceLabel: Record<VoiceState, string> = {
    idle: t("chat2.idle"),
    listening: t("listening"),
    thinking: t("thinking"),
    speaking: t("chat2.speaking"),
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {selecting ? (
            <>
              <Button size="sm" variant="destructive" disabled={!selected.size || deleting} onClick={() => removeMessages(false)}><Trash2 className="size-3.5" />{t("chat2.deleteSelected", { count: selected.size })}</Button>
              <Button size="sm" variant="outline" disabled={!selected.size} onClick={() => exportConversation(true)}><Download className="size-3.5" />{t("chat2.exportFirst")}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelecting(false); setSelected(new Set()); }}><X className="size-3.5" />{t("chat2.cancelSelect")}</Button>
            </>
          ) : messages.length > 0 && (
            <>
              <Button size="sm" variant="ghost" disabled={busy} onClick={startSelecting}><ListChecks className="size-3.5" />{t("chat2.select")}</Button>
              <Button size="sm" variant="ghost" onClick={() => exportConversation()}><Download className="size-3.5" />{t("chat2.export")}</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm" variant="ghost" disabled={busy || deleting}><Trash2 className="size-3.5" />{t("chat2.clear")}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>{t("chat2.clearTitle")}</AlertDialogTitle><AlertDialogDescription>{t("chat2.clearBody")}</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><Button variant="outline" onClick={() => exportConversation()}><Download className="size-4" />{t("chat2.exportFirst")}</Button><AlertDialogCancel>{t("chat2.cancelSelect")}</AlertDialogCancel><AlertDialogAction onClick={() => removeMessages(true)}>{t("chat2.clearConfirm")}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
        <div className="inline-flex rounded-full border bg-card p-0.5 text-xs">
          <Button variant="ghost" size="sm" onClick={() => (voiceAllowed ? (unlockAudio(), setMode("voice")) : toast(t("chat2.voicePlan"), { action: { label: t("chat2.plans"), onClick: () => (window.location.href = "/planos") } }))} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5", mode === "voice" && "bg-primary text-primary-foreground")}>
            <AudioLines className="size-3.5" /> {t("chat2.voice")}
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => {
              recRef.current?.stop();
              setHandsFree(false);
              setMode("text");
            }}
            className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5", mode === "text" && "bg-primary text-primary-foreground")}
          >
            <Keyboard className="size-3.5" /> {t("chat2.text")}
          </Button>
        </div>
      </div>

      {mode === "voice" && (() => {
        const last = [...messages].reverse().find((m) => m.role === "assistant");
        const lastText = last ? customerText(last.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join(" ")) : "";
        const caption = voice === "listening" ? interim : voice === "thinking" || status === "submitted" ? "" : lastText;
        return (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
            <Button variant="ghost" onClick={toggleVoice} aria-label={voiceLabel[voice]} style={{ "--signal": orbColorValue(orb.orbColor) } as React.CSSProperties} className={cn("voice-orb relative grid size-48 shrink-0 place-items-center rounded-full p-0 sm:size-56", `is-${voice}`, orb.orbStyle === "minimal" && "orb-minimal")}><ZeroRing className="size-14" /></Button>
            <p className="text-sm font-medium tracking-wide text-muted-foreground">{voiceLabel[voice]}</p>
            <p className="line-clamp-3 min-h-[3.75rem] max-w-sm break-words text-base">{caption}</p>
            {handsFree && <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setHandsFree(false); manualStopRef.current = true; recRef.current?.stop(); }}>{t("chat2.pause")}</Button>}
          </div>
        );
      })()}
      {mode === "text" && <>
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full min-w-0 max-w-2xl px-4 py-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <ZeroRing className="size-16" />
                  <h2 className="mt-6 text-xl font-bold sm:text-2xl">{t("emptyChat")}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t("slogan")}</p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn("flex min-w-0 items-start gap-2", selecting && "cursor-pointer")} onClick={selecting ? () => setSelected((prev) => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; }) : undefined}>
                {selecting && <Checkbox className="mt-3 shrink-0" checked={selected.has(m.id)} aria-label={t("chat2.selectMessage")} />}
                <div className="min-w-0 flex-1">
                <Message from={m.role}>
                  <MessageContent className={m.role === "user" ? "max-w-[90%] break-words rounded-2xl rounded-br-sm bg-ink px-4 py-3 text-sm text-background dark:bg-secondary dark:text-foreground" : "max-w-full break-words rounded-2xl rounded-bl-sm border bg-card px-4 py-3 text-sm"}>
                    {m.parts.map((p, i) => {
                      if (p.type === "text") return <MessageResponse key={i} className="text-sm leading-relaxed">{customerText(p.text)}</MessageResponse>;
                      if (p.type.startsWith("tool-")) {
                        const name = p.type.slice(5);
                        if (HIDDEN_TOOLS.has(name)) return null;
                        const tp = p as unknown as { state: string; output?: unknown };
                        const transaction = name === "add_transaction" ? savedTransaction(tp.state, tp.output) : null;
                        if (transaction) return <div key={i} className="py-2"><TransactionConfirmation transaction={transaction} /></div>;
                        const Icon = TOOL_ICONS[name] ?? CheckCircle2;
                        const label = actionLabel(name, tp.state, tp.output);
                        return label ? <div key={i} className="flex items-center gap-2 py-2 text-sm text-muted-foreground"><Icon className="size-4"/>{label}</div> : null;
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
                </div>
                </div>
              ))}
              {status === "submitted" && <Shimmer className="text-sm">{t("thinking")}</Shimmer>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
          <div className="mx-auto w-full min-w-0 max-w-2xl shrink-0 p-3 sm:p-4">
            <div className="mb-2 flex flex-wrap gap-2">
              {(replies.length ? replies : messages.length === 0 ? suggestions : []).map((s) => (
                <Button variant="outline" size="sm" key={s} onClick={() => send(s)} className="h-auto max-w-full whitespace-normal rounded-full px-3 py-2 text-xs">
                  {s}
                </Button>
              ))}
            </div>
            <PromptInput onSubmit={(msg) => send(msg.text ?? "")}>
              <PromptInputTextarea ref={inputRef} value={voice === "listening" ? interim : text} onChange={(e) => setText(e.target.value)} placeholder={voice === "listening" ? t("listening") : t("chatPlaceholder")} />
              <PromptInputFooter className="justify-between">
                <div className="flex items-center gap-1">
                  {voiceAllowed && <Button type="button" size="icon-sm" variant={voice === "listening" ? "default" : "ghost"} aria-label={t("voice")} onClick={() => { if (voice === "listening") { manualStopRef.current = true; recRef.current?.stop(); } else { unlockAudio(); listen(); } }}>
                    {voice === "listening" ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  </Button>}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t("speakReplies")}
                    title={t("speakReplies")}
                    onClick={() => {
                      if (speakText) stopSpeaking();
                      setSpeakText(!speakText);
                    }}
                  >
                    {speakText ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                  </Button>
                </div>
                <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </>}
    </div>
  );
}
