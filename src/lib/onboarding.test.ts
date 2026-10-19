import { describe, expect, it } from "vitest";
import { preferencesSchema, activityEstimateSchema } from "./onboarding";
const input = { display_name: "Ana", goals: ["time"], language: "pt", currency: "BRL", timezone: "America/Sao_Paulo", health_consent: false, weight_kg: null, height_cm: null, age: null, sex: null };
describe("optional measurements and consent", () => {
  it("accepts onboarding without weight or height", () => { expect(preferencesSchema.safeParse(input).success).toBe(true); });
  it("does not accept health measurements without consent", () => { expect(preferencesSchema.safeParse({ ...input, weight_kg: 70 }).success).toBe(false); });
  it("accepts weight alone with consent, without requiring height", () => { expect(preferencesSchema.safeParse({ ...input, health_consent: true, weight_kg: 70 }).success).toBe(true); });
  it("validates a fifteen-minute activity with a calorie range", () => {
    expect(activityEstimateSchema.safeParse({ activity: "Corrida", minutes: 15, calories: 130, calories_low: 100, calories_high: 160, estimate_note: "Estimativa" }).success).toBe(true);
    expect(activityEstimateSchema.safeParse({ activity: "Corrida", minutes: 15, calories: 130, calories_low: 160, calories_high: 100, estimate_note: "Estimativa" }).success).toBe(false);
  });
});