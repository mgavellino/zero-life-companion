import type { UIMessage } from "ai";

export type HistoryRow = { id: string; role: string; parts: unknown };

export async function readChatHistory(readPage: (from: number, to: number) => Promise<HistoryRow[]>, pageSize = 500): Promise<UIMessage[]> {
  const rows: HistoryRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await readPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows.map((row) => ({ id: row.id, role: row.role as UIMessage["role"], parts: row.parts as UIMessage["parts"] }));
}