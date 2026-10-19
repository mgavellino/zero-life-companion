/** Browser-safe list of MCP tool names shown on the connected-assistants page. */
export const MCP_TOOL_NAMES = ["list_tasks", "add_task", "list_transactions", "add_transaction", "list_meals", "time_summary"] as const;
export type McpToolName = (typeof MCP_TOOL_NAMES)[number];
