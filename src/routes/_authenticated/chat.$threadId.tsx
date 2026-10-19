import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Brain, CheckCircle2, Wallet, ListTodo, Salad, Dumbbell, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import mark from "@/assets/zero-mark.png";
import i18n from "@/lib/i18n";

const msgsQuery = (threadId: string) => ({
  queryKey: ["messages", threadId],
  queryFn: async (): Promise<UIMessage[]> => {
    const { data, error } = await supabase.from("messages").select("id,role,parts").eq("thread_id", threadId).order("created_at");
    if (error) throw error;
    return data.map((m) => ({ id: m.id, role: m.role as UIMessage["role"], parts: m.parts as UIMessage["parts"] }));
  },
  staleTime: Infinity,
});

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(msgsQuery(params.threadId)),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  return <ChatWindow key={threadId} threadId={threadId} />;
}

const TOOL_ICONS: Record<string, typeof Brain> = {
  remember: Brain,
  add_task: ListTodo,
  add_transaction: Wallet,
  set_budget: Target,
  add_meal: Salad,
  create_workout: Dumbbell,
};

function ChatWindow({ threadId }: { threadId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: initial } = useSuspenseQuery(msgsQuery(threadId));
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    messages: initial,
    transport,
    onError: (e) => {
      const m = e.message || "";
      toast.error(m.includes("402") ? "Créditos de IA esgotados." : m.includes("429") ? "Muitas requisições, tente já já." : m || "Erro");
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.invalidateQueries({ queryKey: ["messages", threadId] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "messages" && q.queryKey[0] !== "threads" });
      inputRef.current?.focus();
    },
  });

  useEffect(() => inputRef.current?.focus(), []);
  const busy = status === "submitted" || status === "streaming";
  const send = (v: string) => {
    if (!v.trim() || busy) return;
    sendMessage({ text: v });
    setText("");
  };
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
                    const tp = p as Extract<UIMessage["parts"][number], { type: `tool-${string}` }> & { state: never; input?: unknown; output?: unknown; errorText?: string };
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
          <PromptInputTextarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("chatPlaceholder")} />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
