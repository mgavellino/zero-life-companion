import { describe, expect, it } from "vitest";
import { dailyTimeSummary, logTimeSchema, startTimeSchema } from "./time-tracking";

describe("Daily time breakdown", () => {
  it("has no summary data before any time is recorded", () => {
    const result = dailyTimeSummary([], "2026-10-19", new Date("2026-10-20T12:00:00"));
    expect(result.total).toBe(0);
    expect(result.untrackedPercent).toBe(100);
  });
  it("calculates each category's percent of the categorised time", () => {
    const result = dailyTimeSummary([
      { id: "1", category: "work", started_at: "2026-10-19T00:00:00", ended_at: "2026-10-19T06:00:00" },
      { id: "2", category: "gaming", started_at: "2026-10-19T06:00:00", ended_at: "2026-10-19T08:00:00" },
    ], "2026-10-19", new Date("2026-10-20T12:00:00"));
    expect(result.entries.find(x => x.category === "work")?.percent).toBe(75);
    expect(result.entries.find(x => x.category === "gaming")?.percent).toBe(25);
    expect(result.entries.find(x => x.category === "work")?.dayPercent).toBe(25);
    expect(result.untrackedPercent).toBeCloseTo(66.67, 1);
  });
  it("rejects unsupported categories", () => {
    expect(startTimeSchema.safeParse({ category: "invented" }).success).toBe(false);
  });
  it("rejects entries longer than a day", () => {
    expect(logTimeSchema.safeParse({ category: "work", minutes: 24 * 60 + 1, dayStart: "2026-10-19T03:00:00.000Z" }).success).toBe(false);
  });
});
