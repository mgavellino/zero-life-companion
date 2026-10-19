import { describe, expect, it } from "vitest";
import { dailyTimeSummary, startTimeSchema } from "./time-tracking";

describe("Daily time tracking", () => {
  it("has no summary data before any time is recorded", () => {
    const result = dailyTimeSummary([], "2026-10-19", new Date("2026-10-20T12:00:00"));
    expect(result.total).toBe(0);
    expect(result.untrackedPercent).toBe(100);
  });
  it("calculates work and gaming percentages against the full day", () => {
    const result = dailyTimeSummary([
      { id: "1", category: "work", started_at: "2026-10-19T08:00:00", ended_at: "2026-10-19T14:00:00" },
      { id: "2", category: "gaming", started_at: "2026-10-19T15:00:00", ended_at: "2026-10-19T18:00:00" },
    ], "2026-10-19", new Date("2026-10-20T12:00:00"));
    expect(result.entries.find(x => x.category === "work")?.percent).toBe(25);
    expect(result.entries.find(x => x.category === "gaming")?.percent).toBe(12.5);
    expect(result.untrackedPercent).toBe(62.5);
  });
  it("splits sessions across midnight", () => {
    const result = dailyTimeSummary([{ id: "1", category: "work", started_at: "2026-10-18T23:00:00", ended_at: "2026-10-19T01:00:00" }], "2026-10-19", new Date("2026-10-20T12:00:00"));
    expect(result.total).toBe(3600);
  });
  it("rejects unsupported categories", () => {
    expect(startTimeSchema.safeParse({ category: "invented" }).success).toBe(false);
  });
});