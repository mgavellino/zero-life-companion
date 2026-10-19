import { describe, expect, it } from "vitest";
import { highestPlan, PRICES, savingsPct, hasPremiumVoice, hasUnlimitedChat, hasVoiceChat, LIMITS, TRIAL_DAYS, priceId } from "./plans";

describe("plans", () => {
  it("monthly prices are 9,90 / 21,90 / 37,90", () => {
    expect([PRICES.essencial.monthly, PRICES.pro.monthly, PRICES.max.monthly]).toEqual([990, 2190, 3790]);
  });
  it("semiannual and yearly are cheaper than monthly", () => {
    for (const p of ["essencial", "pro", "max"] as const) {
      expect(savingsPct(p, "semiannual")).toBeGreaterThan(0);
      expect(savingsPct(p, "yearly")).toBeGreaterThan(savingsPct(p, "semiannual"));
    }
  });
  it("free trial is 1 month", () => expect(TRIAL_DAYS).toBe(30));
  it("message limits per day: free 5, essencial 40, pro 200, max unlimited", () => {
    expect([LIMITS.free, LIMITS.essencial, LIMITS.pro, LIMITS.max].map((l) => l.messagesPerDay)).toEqual([5, 40, 200, null]);
    expect(hasUnlimitedChat("max")).toBe(true);
  });
  it("free has no voice chat", () => {
    expect(hasVoiceChat("free")).toBe(false);
    expect(hasVoiceChat("essencial")).toBe(true);
  });
  it("only max has reports", () => expect(LIMITS.pro.reports).toBe(false));
  it("free plan has limited chat and no premium voice", () => {
    expect(hasUnlimitedChat("free")).toBe(false);
    expect(hasPremiumVoice("essencial")).toBe(false);
    expect(hasPremiumVoice("pro")).toBe(true);
  });
  it("price ids match catalog", () => expect(priceId("pro", "semiannual")).toBe("pro_semiannual"));
  it("admin grant wins when higher than subscription", () => {
    expect(highestPlan("essencial", "max")).toBe("max");
    expect(highestPlan("pro", "essencial")).toBe("pro");
  });
});
