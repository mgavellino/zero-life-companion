import { describe, expect, it } from "vitest";
import { readChatHistory } from "./chat-history";

describe("continuous database history", () => {
  it("restores every saved user and assistant message across pages in order", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: String(i), role: i % 2 ? "assistant" : "user", parts: [{ type: "text", text: `message ${i}` }] }));
    const result = await readChatHistory(async (from, to) => rows.slice(from, to + 1), 2);
    expect(result).toEqual(rows);
    expect(result.map((m) => m.id)).toEqual(["0", "1", "2", "3", "4"]);
  });
  it("does not turn a database failure into an empty conversation", async () => {
    await expect(readChatHistory(async () => { throw new Error("read failed"); })).rejects.toThrow("read failed");
  });
});