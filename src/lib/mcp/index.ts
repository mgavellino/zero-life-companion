import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { listTasksTool, addTaskTool } from "./tools/tasks";
import { listTransactionsTool, addTransactionTool } from "./tools/money";
import { listMealsTool, timeSummaryTool } from "./tools/body-time";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "assistentezero",
  title: "Assistentezero",
  version: "0.1.0",
  instructions: "Tools for Zero, a personal assistant for time, money and diet. Read and add the signed-in user's tasks and transactions, and read their meals and daily time split. Every call only sees the caller's own account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasksTool, addTaskTool, listTransactionsTool, addTransactionTool, listMealsTool, timeSummaryTool],
});
