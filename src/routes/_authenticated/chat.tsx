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
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { ZeroRing } from "@/components/Logo";
import { speak, stopSpeaking } from "@/lib/speak";
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { useSubscription } from "@/hooks/use-subscription";
import { hasVoiceChat } from "@/lib/plans";

const chatQuery = {
  queryKey: ["chat"],
  queryFn: async (): Promise<{ threadId: string; messages: UIMessage[] }> => {
    const { data: th } = await supabase.from("threads").select("id").order("created_at").limit(1);
    let threadId = th?.[0]?.id;
    if (!threadId) {
      const { data, error } = await supabase.from("threads").insert({ title: "Zero" }).select("id").single();
      if (error) throw error;
      threadId = data.id;
    }
    const { data, error } = await supabase.from("messages").select("id,role,parts").eq("thread_id", threadId).order("created_at");
    if (error) throw error;
    return { threadId, messages: data.map((m) => ({ id: m.id, role: m.role as UIMessage["role"], parts: m.parts as UIMessage["parts"] })) };
  },
  staleTime: 0,
};

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat de voz — Zero" },
      { name: "description", content: "Fale com o Zero, seu assistente pessoal, por voz ou texto." },
      { property: "og:title", content: "Chat de voz — Zero" },
      { property: "og:description", content: "Fale com o Zero, seu assistente pessoal, por voz ou texto." },
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
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").replace(/[*#_`>|]/g, " ").replace(/\s+/g, " ").trim();
}

function quickReplies(m: UIMessage | undefined): string[] {
  if (!m || m.role !== "assistant") return [];
  for (const p of m.parts) {
    if (p.type === "tool-suggest_replies") {
      const o = (p as unknown as { output?: { options?: string[] } }).output;
      if (o?.options) return o.options;
    }
  }
  return [];
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

function ChatPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: initial } = useSuspenseQuery(chatQuery);
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
      if (m.includes("LIMIT")) toast.error("Você atingiu o limite diário de mensagens do seu plano.", { action: { label: "Ver planos", onClick: () => (window.location.href = "/planos") } });
      else toast.error(m.includes("429") ? "Muitas requisições, tente já já." : m || "Erro");
    },
    onFinish: async ({ message }) => {
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
      toast.error("Seu navegador não suporta voz. Use o Chrome, Edge ou Safari.");
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
        const r = e.results[i]!;
        if (r.isFinal) finalText += r[0]!.transcript;
        else tmp += r[0]!.transcript;
      }
      setInterim(finalText + tmp);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") toast.error("Permita o microfone para falar com o Zero.");
      else if (e.error !== "no-speech" && e.error !== "aborted") toast.error(e.error);
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
  }, [send]);
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
    idle: "Toque para falar",
    listening: "Ouvindo…",
    thinking: "Pensando…",
    speaking: "Falando… toque para interromper",
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end gap-1 border-b px-4 py-2">
        <div className="inline-flex rounded-full border bg-card p-0.5 text-xs">
          <button onClick={() => (voiceAllowed ? setMode("voice") : toast("Chat de voz a partir do plano Essencial.", { action: { label: "Ver planos", onClick: () => (window.location.href = "/planos") } }))} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5", mode === "voice" && "bg-primary text-primary-foreground")}>
            <AudioLines className="size-3.5" /> Voz
          </button>
          <button
            onClick={() => {
              recRef.current?.stop();
              setHandsFree(false);
              setMode("text");
            }}
            className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5", mode === "text" && "bg-primary text-primary-foreground")}
          >
            <Keyboard className="size-3.5" /> Texto
          </button>
        </div>
      </div>

      {mode === "voice" ? (
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pb-10">
          <div className="pointer-events-none absolute inset-0 zero-aura" />
          <button
            onClick={toggleVoice}
            aria-label={voiceLabel[voice]}
            className={cn("voice-orb relative grid size-56 place-items-center rounded-full md:size-72", `is-${voice}`)}
          >
            <ZeroRing className="size-24 md:size-28" />
          </button>
          <p className="mt-10 font-display text-sm uppercase tracking-[0.25em] text-muted-foreground">{voiceLabel[voice]}</p>
          <p className="mt-4 min-h-[3.5rem] max-w-2xl text-center text-xl font-medium md:text-2xl">
            {voice === "listening" ? interim || "…" : voice === "thinking" ? <Shimmer>{t("thinking")}</Shimmer> : lastAssistant ? plainText(lastAssistant).slice(0, 280) : t("emptyChat")}
          </p>
          <div className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
            {(replies.length ? replies : messages.length === 0 ? suggestions : []).map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border bg-card/80 px-4 py-2 text-sm backdrop-blur hover:border-ring">
                {s}
              </button>
            ))}
          </div>
          {handsFree && (
            <button onClick={() => setHandsFree(false)} className="mt-6 text-xs text-muted-foreground underline">
              Pausar conversa contínua
            </button>
          )}
          <Link to="/planos" className="mt-4 text-xs text-muted-foreground hover:text-foreground">
            Voz premium nos planos Pro e Max
          </Link>
        </div>
      ) : (
        <>
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto w-full max-w-3xl">
              {messages.length === 0 && (
                <div className="flex flex-col items-center pt-16 text-center">
                  <ZeroRing className="size-16" />
                  <h2 className="mt-6 text-3xl font-bold">{t("emptyChat")}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t("slogan")}</p>
                </div>
              )}
              {messages.map((m) => (
                <Message from={m.role} key={m.id}>
                  <MessageContent className={m.role === "user" ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground" : ""}>
                    {m.parts.map((p, i) => {
                      if (p.type === "text") return <MessageResponse key={i}>{p.text}</MessageResponse>;
                      if (p.type.startsWith("tool-")) {
                        const name = p.type.slice(5);
                        if (HIDDEN_TOOLS.has(name)) return null;
                        const tp = p as unknown as { type: string; state: never; input?: unknown; output?: unknown; errorText?: string };
                        const Icon = TOOL_ICONS[name] ?? CheckCircle2;
                        return (
                          <Tool key={i} defaultOpen={false}>
                            <ToolHeader type={tp.type as never} state={tp.state} title={name.replace("_", " ")} />
                            <ToolContent>
                              <div className="flex items-center gap-2 px-4 pt-2 text-xs text-muted-foreground"><Icon className="size-3.5" /> Zero</div>
                              <ToolInput input={tp.input} />
                              <ToolOutput output={tp.output as never} errorText={tp.errorText} />
                            </ToolContent>
                          </Tool>
                        );
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
          <div className="mx-auto w-full max-w-3xl p-4">
            <div className="mb-2 flex flex-wrap gap-2">
              {(replies.length ? replies : messages.length === 0 ? suggestions : []).map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-xs hover:border-ring">
                  {s}
                </button>
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
      )}
    </div>
  );
}
