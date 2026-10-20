import { describe, expect, it } from "vitest";
import { chatStepPolicy } from "./chat-generation";

describe("chat action completion", () => {
  it("reserves the final generation for a written answer, not another tool call", () => {
    expect(chatStepPolicy(4).toolChoice).toBe("none");
    expect(chatStepPolicy(5).toolChoice).toBe("none");
    expect(chatStepPolicy(0).toolChoice).toBeUndefined();
  });
});