import { describe, expect, it } from "vitest";
import { effectivePlan, subscriptionGrantsAccess, trialEligible } from "./entitlement";

const now = new Date("2026-10-21T12:00:00Z");
const day = 86400000;
const iso = (ms: number) => new Date(now.getTime() + ms).toISOString();

describe("entitlement", () => {
  it("keeps paid access for 7 days after a failed renewal", () => {
    expect(subscriptionGrantsAccess({ status: "past_due", product_id: "pro_plan", current_period_end: iso(-day), past_due_since: iso(-6 * day) }, now)).toBe(true);
    expect(subscriptionGrantsAccess({ status: "past_due", product_id: "pro_plan", current_period_end: iso(-day), past_due_since: iso(-8 * day) }, now)).toBe(false);
  });
  it("canceled keeps access until period end, paused has none", () => {
    expect(subscriptionGrantsAccess({ status: "canceled", product_id: "pro_plan", current_period_end: iso(day) }, now)).toBe(true);
    expect(subscriptionGrantsAccess({ status: "canceled", product_id: "pro_plan", current_period_end: null }, now)).toBe(false);
    expect(subscriptionGrantsAccess({ status: "paused", product_id: "pro_plan", current_period_end: iso(day) }, now)).toBe(false);
  });
  it("uses the highest live subscription, not just the newest", () => {
    const rows = [
      { status: "canceled", product_id: "essencial_plan", current_period_end: iso(-day), created_at: iso(0) },
      { status: "active", product_id: "max_plan", current_period_end: iso(day), created_at: iso(-10 * day) },
    ];
    expect(effectivePlan(rows, [], now)).toBe("max");
  });
  it("free trial only once per person", () => {
    expect(trialEligible(0, 0)).toBe(true);
    expect(trialEligible(1, 0)).toBe(false);
    expect(trialEligible(0, 1)).toBe(false);
  });
});
