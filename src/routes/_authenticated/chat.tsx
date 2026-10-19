import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Brain, CheckCircle2, Wallet, ListTodo, Salad, Target, Mic, MicOff, Volume2, VolumeX, Keyboard, AudioLines, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { actionLabel, customerText, savedTransaction } from "@/lib/chat-presentation";
import { TransactionConfirmation } from "@/components/TransactionConfirmation";
import { Button } from "@/components/ui/button";
import { ZeroRing } from "@/components/Logo";
import { speak, stopSpeaking } from "@/lib/speak";
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { useSubscription } from "@/hooks/use-subscription";
import { hasVoiceChat } from "@/lib/plans";
import { readChatHistory } from "@/lib/chat-history";

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

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initial.messages,
    transport,
    onError: (e) => {
      const m = e.message || "";
      setVoice("idle");
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
      if (modeRef.current === "voice" && handsFreeRef.current) listenRef.current();
      else inputRef.current?.focus();
    },
  });

  useEffect(() => () => stopSpeaking(), []);
  const busy = status === "submitted" || status === "streaming";
  const send = useCallback(
    (v: string) => {
      if (!v.trim() || busy) return;
      stopSpeaking();
      setVoice("thinking");
      sendMessage({ text: v });
      setText("");
    },
    [busy, sendMessage],
  );

  const listen = useCallback(() => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error(t("chat2.browserError"));
      setMode("text");
      return;
    }
    stopSpeaking();
    const rec = new Ctor();
    rec.lang = LOCALES[i18n.language] ?? "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let tmp = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const transcript = r?.[0]?.transcript;
        if (!r || !transcript) continue;
        if (r.isFinal) finalText += transcript;
        else tmp += transcript;
      }
      setInterim(finalText + tmp);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") toast.error(t("chat2.micError"));
      else if (e.error !== "no-speech" && e.error !== "aborted") toast.error(t("chat2.hearingError"));
    };
    rec.onend = () => {
      recRef.current = null;
      setInterim("");
      if (finalText.trim()) {
        if (modeRef.current === "voice") send(finalText);
        else {
          setText(finalText);
          send(finalText);
        }
      } else setVoice("idle");
    };
    recRef.current = rec;
    setVoice("listening");
    rec.start();
  }, [send, t]);
  listenRef.current = listen;

  function toggleVoice() {
    if (voice === "listening") {
      recRef.current?.stop();
      return;
    }
    if (voice === "speaking") {
      stopSpeaking();
      setVoice("idle");
      return;
    }
    if (voice === "thinking") return;
    setHandsFree(true);
    listen();
  }

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
      <div className="flex items-center justify-end gap-1 border-b px-4 py-2">
        <div className="inline-flex rounded-full border bg-card p-0.5 text-xs">
          <Button variant="ghost" size="sm" onClick={() => (voiceAllowed ? setMode("voice") : toast(t("chat2.voicePlan"), { action: { label: t("chat2.plans"), onClick: () => (window.location.href = "/planos") } }))} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5", mode === "voice" && "bg-primary text-primary-foreground")}>
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

      {mode === "voice" && (
        <div className="flex shrink-0 items-center justify-center gap-4 border-b bg-card/50 px-4 py-3">
          <Button variant="ghost" onClick={toggleVoice} aria-label={voiceLabel[voice]} className={cn("voice-orb relative grid size-16 shrink-0 place-items-center rounded-full p-0", `is-${voice}`)}><ZeroRing className="size-7" /></Button>
          <div className="min-w-0"><p className="text-sm font-medium">{voiceLabel[voice]}</p><p className="mt-1 max-w-lg break-words text-xs text-muted-foreground">{voice === "listening" ? interim || "…" : t("chat2.assistant")}</p>{handsFree && <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => {setHandsFree(false); recRef.current?.stop();}}>{t("chat2.pause")}</Button>}</div>
        </div>
      )}
      <>
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
                <Message from={m.role} key={m.id}>
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
                  {voiceAllowed && <Button type="button" size="icon-sm" variant={voice === "listening" ? "default" : "ghost"} aria-label={t("voice")} onClick={() => (voice === "listening" ? recRef.current?.stop() : listen())}>
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
        </>
    </div>
  );
}
