import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const dateArg = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date YYYY-MM-DD, default today (UTC).");

export const listMealsTool = defineTool({
  name: "list_meals",
  title: "List meals",
  description: "List the meals and macros the signed-in user logged in Zero on a given day.",
  inputSchema: { date: dateArg },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    const day = date ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseForUser(ctx).from("meals").select("id,name,meal_type,calories,protein,carbs,fat").eq("eaten_on", day).order("created_at");
    if (error) throw new ToolError("Could not load meals.");
    const meals = (data ?? []).map((m) => ({ id: m.id, name: m.name, meal_type: m.meal_type, calories: m.calories, protein: Number(m.protein), carbs: Number(m.carbs), fat: Number(m.fat) }));
    const total = meals.reduce((s, m) => s + m.calories, 0);
    const text = meals.length ? `${meals.map((m) => `${m.meal_type}: ${m.name} — ${m.calories} kcal`).join("\n")}\nTotal: ${total} kcal` : "No meals logged that day.";
    return { content: [{ type: "text", text }], structuredContent: { date: day, total_calories: total, meals } };
  },
});

export const timeSummaryTool = defineTool({
  name: "time_summary",
  title: "Time summary",
  description: "Show how the signed-in user's logged time was split across activities on a given day, in hours and percent.",
  inputSchema: { date: dateArg },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    const day = date ?? new Date().toISOString().slice(0, 10);
    const start = `${day}T00:00:00Z`, end = new Date(Date.parse(start) + 86_400_000).toISOString();
    const { data, error } = await supabaseForUser(ctx).from("time_sessions").select("category,started_at,ended_at").gte("started_at", start).lt("started_at", end);
    if (error) throw new ToolError("Could not load time entries.");
    const totals = new Map<string, number>();
    for (const s of data ?? []) if (s.ended_at) totals.set(s.category, (totals.get(s.category) ?? 0) + (Date.parse(s.ended_at) - Date.parse(s.started_at)) / 60_000);
    const all = [...totals.values()].reduce((a, b) => a + b, 0);
    const activities = [...totals].map(([category, minutes]) => ({ category, minutes: Math.round(minutes), percent: all ? Math.round((minutes / all) * 100) : 0 })).sort((a, b) => b.minutes - a.minutes);
    const text = activities.length ? activities.map((a) => `${a.category}: ${(a.minutes / 60).toFixed(1)}h (${a.percent}%)`).join("\n") : "No time logged that day.";
    return { content: [{ type: "text", text }], structuredContent: { date: day, activities } };
  },
});
