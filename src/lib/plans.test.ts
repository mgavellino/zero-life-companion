import { describe, expect, it } from "vitest";
import { PRICES, savingsPct, hasPremiumVoice, hasUnlimitedChat, TRIAL_DAYS, priceId } from "./plans";

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
  it("free trial is 7 days", () => expect(TRIAL_DAYS).toBe(7));
  it("free plan has limited chat and no premium voice", () => {
    expect(hasUnlimitedChat("free")).toBe(false);
    expect(hasPremiumVoice("essencial")).toBe(false);
    expect(hasPremiumVoice("pro")).toBe(true);
  });
  it("price ids match catalog", () => expect(priceId("pro", "semiannual")).toBe("pro_semiannual"));
});
