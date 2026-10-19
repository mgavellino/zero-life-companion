import { z } from "zod";

export const preferencesSchema = z.object({
  display_name: z.string().trim().max(80),
  goals: z.array(z.enum(["time", "money", "body"])).min(1).max(3),
  language: z.enum(["pt", "en", "es", "fr", "de", "it"]),
  currency: z.enum(["BRL", "USD", "EUR", "GBP", "JPY", "CHF"]),
  timezone: z.string().min(1).max(80).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }),
  health_consent: z.boolean(),
  weight_kg: z.number().min(20).max(350).nullable(),
  height_cm: z.number().min(80).max(250).nullable(),
  age: z.number().int().min(18).max(100).nullable(),
  sex: z.enum(["male", "female"]).nullable(),
}).superRefine((value, ctx) => {
  if (!value.health_consent && [value.weight_kg, value.height_cm, value.age, value.sex].some(v => v !== null)) {
    ctx.addIssue({ code: "custom", message: "Autorize o uso das medidas ou deixe-as em branco." });
  }
});
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export const activityEstimateSchema = z.object({
  activity: z.string().trim().min(1).max(100),
  minutes: z.number().positive().max(1440),
  calories: z.number().min(0).max(20000),
  calories_low: z.number().min(0).max(20000),
  calories_high: z.number().min(0).max(20000),
  estimate_note: z.string().max(240),
}).refine(v => v.calories_low <= v.calories && v.calories <= v.calories_high, "Intervalo inválido");