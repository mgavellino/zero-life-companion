import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Brain, CheckCircle2, Wallet, ListTodo, Salad, Target, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import mark from "@/assets/zero-mark.png";
import i18n from "@/lib/i18n";

// One continuous conversation per user (reuses their single thread row).
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
  staleTime: Infinity,
};

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Zero" },
      { name: "description", content: "Converse com o Zero por texto ou voz." },
      { property: "og:title", content: "Chat — Zero" },
      { property: "og:description", content: "Converse com o Zero por texto ou voz." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(chatQuery),
  component: ChatPage,
});

const TOOL_ICONS: Record<string, typeof Brain> = { remember: Brain, add_task: ListTodo, add_transaction: Wallet, set_budget: Target, add_meal: Salad };
const LOCALES: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT" };

type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

function plainText(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").replace(/[*#_`>|-]/g, " ").trim();
}

function ChatPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: initial } = useSuspenseQuery(chatQuery);
  const threadId = initial.threadId;
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const speakRef = useRef(false);
  speakRef.current = speak;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SR | null>(null);

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
      toast.error(m.includes("429") ? "Muitas requisições, tente já já." : m || "Erro");
    },
    onFinish: ({ message }) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "chat" });
      if (speakRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(plainText(message));
        u.lang = LOCALES[i18n.language] ?? "pt-BR";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
      inputRef.current?.focus();
    },
  });

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  const busy = status === "submitted" || status === "streaming";
  const send = (v: string) => {
    if (!v.trim() || busy) return;
    sendMessage({ text: v });
    setText("");
  };

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Seu navegador não suporta voz. Use o Chrome ou Safari.");
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    rec.lang = LOCALES[i18n.language] ?? "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalText += r[0]!.transcript;
        else interim += r[0]!.transcript;
      }
      setText(finalText + interim);
    };
    rec.onerror = (e) => e.error !== "no-speech" && toast.error(e.error);
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) {
        setSpeak(true);
        send(finalText);
      }
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  const suggestions = t("suggestions", { returnObjects: true }) as string[];

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-20 text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-primary">
                <img src={mark} alt="Zero" width={816} height={816} className="size-14" />
              </div>
              <h2 className="mt-6 text-3xl font-bold">{t("emptyChat")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("slogan")}</p>
              <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-xl border bg-card p-3 text-left text-sm hover:border-ring">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message from={m.role} key={m.id}>
              <MessageContent className={m.role === "user" ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground" : ""}>
                {m.parts.map((p, i) => {
                  if (p.type === "text") return <MessageResponse key={i}>{p.text}</MessageResponse>;
                  if (p.type.startsWith("tool-")) {
                    const tp = p as unknown as { type: string; state: never; input?: unknown; output?: unknown; errorText?: string };
                    const name = p.type.slice(5);
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
        <PromptInput onSubmit={(msg) => send(msg.text ?? "")}>
          <PromptInputTextarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? t("listening") : t("chatPlaceholder")} />
          <PromptInputFooter className="justify-between">
            <div className="flex items-center gap-1">
              <Button type="button" size="icon-sm" variant={listening ? "default" : "ghost"} aria-label={t("voice")} onClick={toggleMic} className={listening ? "animate-pulse" : ""}>
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("speakReplies")}
                title={t("speakReplies")}
                onClick={() => {
                  if (speak) window.speechSynthesis?.cancel();
                  setSpeak(!speak);
                }}
              >
                {speak ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
            </div>
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
