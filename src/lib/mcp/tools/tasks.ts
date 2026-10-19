import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export const listTasksTool = defineTool({
  name: "list_tasks",
  title: "List tasks",
  description: "List the signed-in user's open Zero tasks and appointments, soonest first.",
  inputSchema: { include_done: z.boolean().optional().describe("Also include completed tasks.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_done }, ctx) => {
    let query = supabaseForUser(ctx).from("tasks").select("id,title,due_at,minutes,priority,done").order("due_at", { ascending: true, nullsFirst: false }).limit(100);
    if (!include_done) query = query.eq("done", false);
    const { data, error } = await query;
    if (error) throw new ToolError("Could not load tasks.");
    const tasks = (data ?? []).map((t) => ({ id: t.id, title: t.title, due_at: t.due_at, minutes: t.minutes, priority: t.priority, done: t.done }));
    const text = tasks.length ? tasks.map((t) => `${t.done ? "[x]" : "[ ]"} ${t.title}${t.due_at ? ` — ${t.due_at}` : ""}`).join("\n") : "No tasks.";
    return { content: [{ type: "text", text }], structuredContent: { tasks } };
  },
});

export const addTaskTool = defineTool({
  name: "add_task",
  title: "Add task",
  description: "Create a task or appointment in the signed-in user's Zero agenda.",
  inputSchema: {
    title: z.string().min(1).max(200).describe("Task title."),
    due_at: z.string().datetime({ offset: true }).optional().describe("Optional start time, ISO 8601 with timezone."),
    minutes: z.number().int().min(1).max(1440).optional().describe("Optional duration in minutes."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Priority, default medium."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, due_at, minutes, priority }, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not signed in.");
    const { data, error } = await supabaseForUser(ctx).from("tasks").insert({ user_id: userId, title, due_at: due_at ?? null, minutes: minutes ?? null, priority: priority ?? "medium" }).select("id,title,due_at").single();
    if (error) throw new ToolError("Could not save the task.");
    return { content: [{ type: "text", text: `Task saved: ${data.title}` }], structuredContent: { task: { id: data.id, title: data.title, due_at: data.due_at } } };
  },
});
