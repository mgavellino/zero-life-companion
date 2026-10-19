import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserPlan } from "@/lib/plan.server";
import { LIMITS } from "@/lib/plans";

async function groqJson<T>(system: string, user: string): Promise<T> {
  const key = process.env["GROQ_API_KEY"];
  if (!key) throw new Error("GROQ_API_KEY ausente");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-oss-120b", response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`IA ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { choices: { message: { content: string } }[] };
  return JSON.parse(j.choices[0]?.message.content ?? "{}") as T;
}

async function requireMax(ctx: { supabase: unknown; userId: string }) {
  const plan = await getUserPlan(ctx.supabase as never, ctx.userId);
  if (!LIMITS[plan].reports) throw new Error("UPGRADE_MAX");
}

/** Advanced money + time report for the last 3 months, with AI insights. Max only. */
export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireMax(context);
    const since = new Date();
    since.setMonth(since.getMonth() - 2, 1);
    const from = since.toISOString().slice(0, 10);
    const [tx, tasks, meals] = await Promise.all([
      context.supabase.from("transactions").select("kind,amount,category,occurred_on").gte("occurred_on", from),
      context.supabase.from("tasks").select("done,minutes,created_at,due_at").gte("created_at", from),
      context.supabase.from("meals").select("calories,protein,eaten_on").gte("eaten_on", from),
    ]);
    const months: Record<string, { income: number; expense: number }> = {};
    const cats: Record<string, number> = {};
    for (const t of tx.data ?? []) {
      const m = t.occurred_on.slice(0, 7);
      months[m] ??= { income: 0, expense: 0 };
      if (t.kind === "income") months[m].income += Number(t.amount);
      else {
        months[m].expense += Number(t.amount);
        cats[t.category] = (cats[t.category] ?? 0) + Number(t.amount);
      }
    }
    const done = (tasks.data ?? []).filter((t) => t.done).length;
    const total = (tasks.data ?? []).length;
    const minutes = (tasks.data ?? []).filter((t) => t.done).reduce((a, t) => a + (t.minutes ?? 0), 0);
    const days = new Set((meals.data ?? []).map((m) => m.eaten_on)).size || 1;
    const avgKcal = Math.round((meals.data ?? []).reduce((a, m) => a + Number(m.calories), 0) / days);
    const avgProt = Math.round((meals.data ?? []).reduce((a, m) => a + Number(m.protein), 0) / days);
    const summary = {
      months: Object.entries(months).sort().map(([month, v]) => ({ month, ...v })),
      categories: Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount })),
      tasks: { done, total, minutes },
      diet: { avgKcal, avgProt },
    };
    const ai = await groqJson<{ insights: string[] }>(
      'You are a sharp personal finance + productivity coach. Reply ONLY JSON {"insights": [4-6 short, concrete, numeric insights in Brazilian Portuguese with a next action each]}.',
      JSON.stringify(summary),
    ).catch(() => ({ insights: [] as string[] }));
    return { ...summary, insights: ai.insights ?? [] };
  });

/** The assistant plans the user's week and creates the tasks. Max only. */
export const planWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { goal?: string; tz?: string }) => ({ goal: String(i.goal ?? "").slice(0, 400), tz: String(i.tz ?? "America/Sao_Paulo").slice(0, 60) }))
  .handler(async ({ data, context }) => {
    await requireMax(context);
    const { data: open } = await context.supabase.from("tasks").select("title,due_at,minutes,priority").eq("done", false).limit(40);
    const plan = await groqJson<{ blocks: { title: string; due_at: string; minutes: number; priority: string }[] }>(
      `Plan the user's next 7 days starting ${new Date().toISOString()} (timezone ${data.tz}). Mix existing open tasks, money check-ins (review spending, pay bills) and body (meal prep, walks). 8-14 blocks, realistic hours 07:00-21:00 local, ISO datetimes with offset. Titles in Brazilian Portuguese. Reply ONLY JSON {"blocks":[{"title","due_at","minutes","priority":"alta"|"media"|"baixa"}]}. Do not duplicate existing tasks; instead schedule them.`,
      JSON.stringify({ goal: data.goal, open_tasks: open ?? [] }),
    );
    const rows = (plan.blocks ?? [])
      .filter((b) => b.title && !isNaN(Date.parse(b.due_at)))
      .slice(0, 14)
      .map((b) => ({ user_id: context.userId, title: b.title.slice(0, 120), due_at: new Date(b.due_at).toISOString(), minutes: Math.min(240, Math.max(5, Number(b.minutes) || 30)), priority: ["alta", "media", "baixa"].includes(b.priority) ? b.priority : "media" }));
    if (rows.length) {
      const { error } = await context.supabase.from("tasks").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { created: rows.length, blocks: rows };
  });
