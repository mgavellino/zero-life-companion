import { VadRecorder, prefersRecorder } from "@/lib/voice-recorder";
import { transcribe } from "@/lib/transcribe";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Brain, CheckCircle2, Wallet, ListTodo, Salad, Target, Mic, MicOff, Volume2, VolumeX, Bell, Trash2, ListChecks, X, Download, RotateCcw, Square, LoaderCircle } from "lucide-react";
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
  const { plan } = useSubscription();
  const voiceAllowed = hasVoiceChat(plan);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [speakText, setSpeakText] = useState(false);
  const speakTextRef = useRef(speakText);
  speakTextRef.current = speakText;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SR | null>(null);
  const [recovery, setRecovery] = useState<"cancelled" | "failed" | "limited" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const cancelSaved = useRef(false);

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

  const { messages, sendMessage, status, stop, setMessages, regenerate } = useChat({
    id: threadId,
    messages: initial.messages,
    transport,
    onError: (e) => {
      const m = e.message || "";
      setVoice("idle");
      setRecovery(m.includes("429") ? "limited" : "failed");
      if (m.includes("LIMIT")) toast.error(t("chat2.limit"), { action: { label: t("chat2.plans"), onClick: () => (window.location.href = "/planos") } });
      else toast.error(m.includes("429") ? t("chat2.rateError") : t("chat2.replyError"));
    },
    onFinish: async ({ message, messages: completedMessages, isAbort, isError }) => {
      qc.setQueryData(chatQuery.queryKey, { threadId, messages: completedMessages });
      void qc.invalidateQueries({ queryKey: chatQuery.queryKey, refetchType: "none" });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "chat" });
      if (isAbort && !cancelSaved.current && message.parts.length) {
        cancelSaved.current = true;
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) await supabase.from("messages").insert({ thread_id: threadId, user_id: auth.user.id, role: "assistant", parts: [...message.parts, { type: "text", text: `\n\n_${t("chatProgress.stopped")}_` }] as never });
      }
      if (isAbort || isError) { setVoice("idle"); return; }
      const shouldSpeak = speakTextRef.current;
      if (shouldSpeak) {
        setVoice("speaking");
        await speak(plainText(message), i18n.language);
      }
      setVoice("idle");
      inputRef.current?.focus();
    },
  });

  useEffect(() => () => { stopSpeaking(); manualStopRef.current = true; recRef.current?.stop(); }, []);
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
  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  function cancelReply() {
    setRecovery("cancelled");
    setVoice("idle");
    stop();
    stopSpeaking();
  }
  const send = useCallback(
    (v: string) => {
      if (!v.trim()) return;
      if (busy) { setVoice("idle"); return; }
      stopSpeaking();
      setRecovery(null);
      cancelSaved.current = false;
      setVoice("thinking");
      sendMessage({ text: v });
      setText("");
    },
    [busy, sendMessage],
  );

  const manualStopRef = useRef(false);
  const vadRef = useRef<VadRecorder | null>(null);
  const recordingGeneration = useRef(0);

  function stopRecording() {
    recordingGeneration.current++;
    manualStopRef.current = true;
    vadRef.current?.close();
    vadRef.current = null;
    recRef.current?.stop();
    recRef.current = null;
    setInterim("");
    setVoice("idle");
  }

  async function toggleMicrophone() {
    if (voice === "listening") { stopRecording(); return; }
    if (busy || voice === "thinking") return;
    stopSpeaking();
    unlockAudio();
    const generation = ++recordingGeneration.current;
    manualStopRef.current = false;
    setVoice("listening");
    if (prefersRecorder()) {
      const recorder = new VadRecorder(async (audio) => {
        if (generation !== recordingGeneration.current) return;
        recorder.close();
        vadRef.current = null;
        setVoice("thinking");
        const heard = await transcribe(audio, i18n.language);
        if (generation !== recordingGeneration.current) return;
        setVoice("idle");
        if (heard) { setText(heard); inputRef.current?.focus(); }
        else toast.error(t("chat2.hearingError"));
      });
      vadRef.current = recorder;
      try {
        await recorder.open();
        if (generation !== recordingGeneration.current) { recorder.close(); return; }
        recorder.resume();
      } catch { stopRecording(); toast.error(t("chat2.micError")); }
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) { stopRecording(); toast.error(t("chat2.browserError")); return; }
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = LOCALES[i18n.language] ?? "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    let heard = "";
    rec.onresult = (event) => {
      if (generation !== recordingGeneration.current) return;
      heard = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
      setInterim(heard);
    };
    rec.onend = () => {
      if (generation !== recordingGeneration.current) return;
      recRef.current = null;
      setInterim("");
      setVoice("idle");
      if (heard) { setText(heard); inputRef.current?.focus(); }
    };
    rec.onerror = () => { stopRecording(); toast.error(t("chat2.hearingError")); };
    try { rec.start(); } catch { stopRecording(); toast.error(t("chat2.micError")); }
  }

  useEffect(() => () => {
    recordingGeneration.current++;
    vadRef.current?.close();
    recRef.current?.stop();
  }, []);

  useEffect(() => {
    if (status !== "submitted") return;
    const id = setTimeout(() => { stop(); setVoice("idle"); setRecovery("failed"); }, 40_000);
    return () => clearTimeout(id);
  }, [status, stop, t]);

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
      setText(draft);
      return "Message placed in the box; the user can review and send it.";
    }),
  });

  const last = messages[messages.length - 1];
  const replies = !busy ? quickReplies(last) : [];
  const suggestions = t("suggestions", { returnObjects: true }) as string[];
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
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
      </div>
          <Conversation initial="instant" className="min-h-0 flex-1">
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
            {(busy || recovery) && <div className="mb-2 flex min-w-0 items-center justify-between gap-2" role="status" aria-live="polite">
              <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">{busy && <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />}<span>{busy ? t(elapsed >= 15 ? "chatProgress.slow" : status === "streaming" ? "chatProgress.writing" : "chatProgress.working") : t(`chatProgress.${recovery}`)}{busy && ` · ${elapsed}s`}</span></p>
              {busy ? <Button size="sm" variant="ghost" onClick={cancelReply}><Square className="size-3" />{t("chatProgress.cancel")}</Button> : <Button size="sm" variant="outline" onClick={() => { setRecovery(null); cancelSaved.current = false; void regenerate({ body: { retry: true } }); }}><RotateCcw className="size-3" />{t("chatProgress.retry")}</Button>}
            </div>}
            <div className="mb-2 flex flex-wrap gap-2">
              {(replies.length ? replies : messages.length === 0 ? suggestions : []).map((s) => (
                <Button variant="outline" size="sm" key={s} onClick={() => send(s)} className="h-auto max-w-full whitespace-normal rounded-full px-3 py-2 text-xs">
                  {s}
                </Button>
              ))}
            </div>
            <PromptInput onSubmit={(msg) => send(msg.text ?? "")}>
              <PromptInputTextarea autoFocus ref={inputRef} value={voice === "listening" ? interim : text} onChange={(e) => setText(e.target.value)} placeholder={voice === "listening" ? t("listening") : t("chatPlaceholder")} />
              <PromptInputFooter className="justify-between">
                <div className="flex items-center gap-1">
                  {voiceAllowed && <Button type="button" size="icon-sm" variant={voice === "listening" ? "default" : "ghost"} disabled={busy || voice === "thinking"} aria-label={t("voice")} title={t("voice")} onClick={toggleMicrophone}>
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
                <PromptInputSubmit aria-label={busy ? t("chatProgress.cancel") : t("send")} status={status} onStop={cancelReply} disabled={!busy && (!text.trim() || voice === "listening" || voice === "thinking")} />
              </PromptInputFooter>
            </PromptInput>
          </div>
    </div>
  );
}
