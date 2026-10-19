import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

/** Wraps a tool so the owner's per-connection block list is enforced before it runs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function guarded<T extends { name: string; handler: (...args: any[]) => any }>(tool: T): T {
  const original = tool.handler;
  return {
    ...tool,
    handler: async (input: unknown, ctx: ToolContext) => {
      const clientId = ctx.getClientId();
      const userId = ctx.getUserId();
      if (!clientId || !userId) throw new ToolError("Not authorized.");
      const { data, error } = await supabaseForUser(ctx).from("mcp_tool_blocks").select("tool_name").eq("client_id", clientId).eq("tool_name", tool.name).maybeSingle();
      if (error) throw new ToolError("Could not check permissions.");
      if (data) throw new ToolError("The account owner has turned this tool off for this assistant.");
      return original(input, ctx);
    },
  } as T;
}
