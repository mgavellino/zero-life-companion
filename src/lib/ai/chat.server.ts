import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const MODEL = "llama-3.3-70b-versatile";

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        h.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const LANG_NAMES: Record<string, string> = { pt: "Portuguese (Brazil)", en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian" };

export async function handleChat(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer /, "");
  if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });
  const sb = userClient(token);
  const { data: u, error: ue } = await sb.auth.getUser(token);
  if (ue || !u.user) return new Response("Unauthorized", { status: 401 });
  const userId = u.user.id;

  const body = (await request.json()) as { messages: UIMessage[]; threadId: string; lang?: string };
  const { messages, threadId } = body;
  const { data: thread } = await sb.from("threads").select("id,title").eq("id", threadId).maybeSingle();
  if (!thread) return new Response("Thread not found", { status: 404 });

  // Persist the latest user message
  const last = messages[messages.length - 1];
  if (last?.role === "user") {
    const { error } = await sb.from("messages").insert({ thread_id: threadId, user_id: userId, role: "user", parts: last.parts as never });
    if (error) console.error("save user msg", error);
    if (thread.title === "Nova conversa") {
      const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").slice(0, 60);
      if (text) await sb.from("threads").update({ title: text }).eq("id", threadId);
    }
  }
  await sb.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);

  // Shared memory across all threads
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [mem, other, tasks, tx, budgets, meals, workouts, profile] = await Promise.all([
    sb.from("memories").select("content,created_at").order("created_at", { ascending: false }).limit(60),
    sb.from("messages").select("role,parts,created_at,thread_id").neq("thread_id", threadId).order("created_at", { ascending: false }).limit(16),
    sb.from("tasks").select("title,due_at,minutes,priority,done").eq("done", false).order("due_at", { ascending: true, nullsFirst: false }).limit(30),
    sb.from("transactions").select("kind,amount,category,description,occurred_on").gte("occurred_on", monthStart),
    sb.from("budgets").select("category,monthly_limit"),
    sb.from("meals").select("name,calories,protein,carbs,fat").eq("eaten_on", today),
    sb.from("workouts").select("name,workout_exercises(name,sets,reps)"),
    sb.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  const income = (tx.data ?? []).filter((t) => t.kind === "income").reduce((a, t) => a + Number(t.amount), 0);
  const expense = (tx.data ?? []).filter((t) => t.kind === "expense").reduce((a, t) => a + Number(t.amount), 0);
  const byCat: Record<string, number> = {};
  for (const t of tx.data ?? []) if (t.kind === "expense") byCat[t.category] = (byCat[t.category] ?? 0) + Number(t.amount);
  const otherSnippets = (other.data ?? [])
    .reverse()
    .map((m) => `${m.role}: ${((m.parts as { type: string; text?: string }[]) ?? []).map((p) => p.text ?? "").join(" ").slice(0, 300)}`)
    .join("\n");

  const lang = LANG_NAMES[body.lang ?? "pt"] ?? "Portuguese (Brazil)";
  const instructions = `You are ZERO, a personal assistant in the spirit of Jarvis: sharp, warm, direct, a bit witty, never verbose. Slogan: "zero waste — of time, money, energy and body".
Your core mission: help the user master TIME and MONEY (most people struggle with both) and take care of their BODY (training + diet). Act like a coach: give concrete next actions, numbers, and hold them accountable.
Always answer in ${lang} unless the user writes in another language.
The user has many chat threads but you are ONE mind with ONE shared memory. Use the memory and recent messages from other threads naturally. When the user reveals a durable fact, goal, preference, income, routine, injury, or diet restriction, call the remember tool.
When the user mentions spending/earning money, a task/appointment, or a meal, log it with the right tool without asking (confirm briefly after). Use markdown, short lists and tables when helpful.
Today is ${today}. User name: ${profile.data?.display_name ?? "unknown"}.

## Long-term memory
${(mem.data ?? []).map((m) => `- ${m.content}`).join("\n") || "(empty)"}

## Recent messages from other threads
${otherSnippets || "(none)"}

## Open tasks
${JSON.stringify(tasks.data ?? [])}

## Money this month
income=${income.toFixed(2)} expense=${expense.toFixed(2)} by_category=${JSON.stringify(byCat)} budgets=${JSON.stringify(budgets.data ?? [])}

## Meals today
${JSON.stringify(meals.data ?? [])}

## Workout sheets
${JSON.stringify(workouts.data ?? [])}`;

  const tools = {
    remember: tool({
      description: "Save a durable fact about the user to long-term memory shared across all threads.",
      inputSchema: z.object({ content: z.string() }),
      execute: async ({ content }) => {
        const { error } = await sb.from("memories").insert({ content, user_id: userId });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
    }),
    add_task: tool({
      description: "Create a task or appointment for the user.",
      inputSchema: z.object({
        title: z.string(),
        due_at: z.string().nullable().describe("ISO datetime or null"),
        minutes: z.number().nullable().describe("estimated duration in minutes"),
        priority: z.enum(["alta", "media", "baixa"]),
      }),
      execute: async (i) => {
        const { error } = await sb.from("tasks").insert({ ...i, user_id: userId });
        return error ? { ok: false, error: error.message } : { ok: true, task: i.title };
      },
    }),
    add_transaction: tool({
      description: "Log an income or expense.",
      inputSchema: z.object({
        kind: z.enum(["income", "expense"]),
        amount: z.number(),
        category: z.string().describe("lowercase category, e.g. alimentação, transporte, moradia, lazer, saúde, salário"),
        description: z.string().nullable(),
        occurred_on: z.string().nullable().describe("YYYY-MM-DD or null for today"),
      }),
      execute: async (i) => {
        const { error } = await sb.from("transactions").insert({ ...i, occurred_on: i.occurred_on ?? today, user_id: userId });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
    }),
    set_budget: tool({
      description: "Set a monthly spending limit for a category.",
      inputSchema: z.object({ category: z.string(), monthly_limit: z.number() }),
      execute: async (i) => {
        const { error } = await sb.from("budgets").upsert({ ...i, user_id: userId }, { onConflict: "user_id,category" });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
    }),
    add_meal: tool({
      description: "Log a meal with estimated macros.",
      inputSchema: z.object({
        name: z.string(),
        meal_type: z.enum(["cafe", "almoco", "lanche", "jantar"]),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
      }),
      execute: async (i) => {
        const { error } = await sb.from("meals").insert({ ...i, calories: Math.round(i.calories), user_id: userId });
        return error ? { ok: false, error: error.message } : { ok: true };
      },
    }),
    create_workout: tool({
      description: "Create a workout sheet with exercises (use English exercise names so demos can be found).",
      inputSchema: z.object({
        name: z.string(),
        notes: z.string().nullable(),
        exercises: z.array(z.object({ name: z.string(), sets: z.number(), reps: z.string(), rest_seconds: z.number() })),
      }),
      execute: async (i) => {
        const { data: w, error } = await sb.from("workouts").insert({ name: i.name, notes: i.notes, user_id: userId }).select("id").single();
        if (error || !w) return { ok: false, error: error?.message };
        const { error: e2 } = await sb.from("workout_exercises").insert(
          i.exercises.map((e, idx) => ({ ...e, workout_id: w.id, user_id: userId, position: idx })),
        );
        return e2 ? { ok: false, error: e2.message } : { ok: true, workout_id: w.id };
      },
    }),
  };

  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) return new Response("A chave da IA (GROQ_API_KEY) ainda não foi configurada.", { status: 503 });
  const provider = createGroq({ apiKey });

  const result = streamText({
    model: provider(MODEL),
    instructions,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onFinish: async ({ responseMessage }) => {
        const { error } = await sb.from("messages").insert({
          thread_id: threadId,
          user_id: userId,
          role: "assistant",
          parts: responseMessage.parts as never,
        });
        if (error) console.error("save assistant msg", error);
      },
    });
}
