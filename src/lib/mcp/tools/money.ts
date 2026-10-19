import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { automaticCategory } from "@/lib/bills";

export const listTransactionsTool = defineTool({
  name: "list_transactions",
  title: "List transactions",
  description: "List the signed-in user's recent income and expenses in Zero, newest first.",
  inputSchema: { days: z.number().int().min(1).max(366).optional().describe("How many past days to include, default 30.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    const since = new Date(Date.now() - (days ?? 30) * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await supabaseForUser(ctx).from("transactions").select("id,kind,amount,category,description,occurred_on").gte("occurred_on", since).order("occurred_on", { ascending: false }).limit(200);
    if (error) throw new ToolError("Could not load transactions.");
    const transactions = (data ?? []).map((t) => ({ id: t.id, kind: t.kind, amount: Number(t.amount), category: t.category, description: t.description, occurred_on: t.occurred_on }));
    const text = transactions.length ? transactions.map((t) => `${t.occurred_on} ${t.kind === "income" ? "+" : "-"}${t.amount} ${t.category}${t.description ? ` (${t.description})` : ""}`).join("\n") : "No transactions in this period.";
    return { content: [{ type: "text", text }], structuredContent: { transactions } };
  },
});

export const addTransactionTool = defineTool({
  name: "add_transaction",
  title: "Add transaction",
  description: "Record an expense or income in the signed-in user's Zero finances; the category is chosen automatically when omitted.",
  inputSchema: {
    kind: z.enum(["expense", "income"]).describe("expense or income."),
    amount: z.number().positive().max(1_000_000_000).describe("Amount in the user's currency."),
    description: z.string().max(200).optional().describe("What it was, e.g. 'mercado'."),
    category: z.string().min(1).max(60).optional().describe("Optional category; automatic when omitted."),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date YYYY-MM-DD, default today."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ kind, amount, description, category, occurred_on }, ctx) => {
    const userId = ctx.getUserId();
    if (!userId) throw new ToolError("Not signed in.");
    const row = { user_id: userId, kind, amount, description: description ?? null, category: automaticCategory(description ?? "", category ?? ""), occurred_on: occurred_on ?? new Date().toISOString().slice(0, 10) };
    const { data, error } = await supabaseForUser(ctx).from("transactions").insert(row).select("id,kind,amount,category,occurred_on").single();
    if (error) throw new ToolError("Could not save the transaction.");
    return { content: [{ type: "text", text: `Saved ${data.kind} of ${data.amount} in ${data.category} on ${data.occurred_on}.` }], structuredContent: { transaction: { id: data.id, kind: data.kind, amount: Number(data.amount), category: data.category, occurred_on: data.occurred_on } } };
  },
});
