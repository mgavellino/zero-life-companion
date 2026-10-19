import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { automaticCategory } from "./bills";

export type CaptureItem =
  | { type: "transaction"; id: string; kind: "income" | "expense"; amount: number; category: string; description: string | null; occurred_on: string; emoji: string }
  | { type: "task"; id: string; title: string; due_at: string | null };

type Parsed = {
  transactions?: { kind: string; amount: number; category: string; description?: string | null; date?: string | null; emoji?: string }[];
  tasks?: { title: string; due_at?: string | null }[];
};

// One sentence ("gastei 30 no almoço e me lembra da luz amanhã") → many entries at once.
export const quickCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { text: string; tz?: string }) => ({ text: String(i.text ?? "").slice(0, 600), tz: String(i.tz ?? "America/Sao_Paulo").slice(0, 60) }))
  .handler(async ({ data, context }) => {
    const key = process.env["GROQ_API_KEY"];
    if (!key) throw new Error("GROQ_API_KEY ausente");
    if (!data.text.trim()) return { items: [] as CaptureItem[] };
    const now = new Date();
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Extract EVERY financial entry and reminder from the user's message. Now is ${now.toISOString()} (user timezone ${data.tz}). Resolve "ontem", "hoje", "amanhã", weekdays.
Reply ONLY JSON: {"transactions":[{"kind":"expense"|"income","amount":number,"category":"lowercase pt-BR category (alimentação, mercado, transporte, moradia, contas, lazer, saúde, educação, compras, assinaturas, salário, freela, outros)","description":"short","date":"YYYY-MM-DD","emoji":"one emoji"}],"tasks":[{"title":"short","due_at":"ISO datetime or null"}]}.
Understand Brazilian slang: "conto"/"pila" = reais, "50 mangos". "uber 18" = expense 18 transporte. "recebi 2k" = income 2000. Empty arrays if nothing.`,
          },
          { role: "user", content: data.text },
        ],
      }),
    });
    if (!res.ok) throw new Error(`IA ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as { choices: { message: { content: string } }[] };
    const p = JSON.parse(j.choices[0]?.message.content ?? "{}") as Parsed;
    const items: CaptureItem[] = [];
    const today = now.toISOString().slice(0, 10);

    for (const t of p.transactions ?? []) {
      const amount = Math.abs(Number(t.amount));
      if (!amount) continue;
      const row = {
        user_id: context.userId,
        kind: t.kind === "income" ? "income" : "expense",
        amount,
        category: automaticCategory(t.description ?? data.text,t.category ?? "").slice(0,40),
        description: t.description?.slice(0, 120) ?? null,
        occurred_on: /^\d{4}-\d{2}-\d{2}$/.test(t.date ?? "") ? (t.date as string) : today,
      };
      const { data: ins, error } = await context.supabase.from("transactions").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      items.push({ type: "transaction", id: ins.id, ...row, kind: row.kind as "income" | "expense", emoji: t.emoji || (row.kind === "income" ? "💰" : "💸") });
    }
    for (const t of p.tasks ?? []) {
      if (!t.title) continue;
      const due = t.due_at && !isNaN(Date.parse(t.due_at)) ? new Date(t.due_at).toISOString() : null;
      const { data: ins, error } = await context.supabase.from("tasks").insert({ user_id: context.userId, title: t.title.slice(0, 120), due_at: due, priority: "media" }).select("id").single();
      if (error) throw new Error(error.message);
      if (due) { const { syncTaskToCalendar } = await import("@/lib/calendar.server"); await syncTaskToCalendar(context.userId, { id: ins.id, title: t.title.slice(0, 120), due_at: due }); }
      items.push({ type: "task", id: ins.id, title: t.title, due_at: due });
    }
    return { items };
  });
