import { z } from "zod";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const PRIORITIES = ["save_money", "pay_debts", "invest", "control_spending", "productivity", "routine", "less_procrastination", "more_free_time", "lose_weight", "gain_muscle", "eat_better", "sleep_better"] as const;
export const DIET_GOALS = ["lose", "maintain", "gain", "health"] as const;
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export const RESTRICTIONS = ["vegetarian", "vegan", "lactose_free", "gluten_free", "low_sugar", "low_sodium", "halal", "kosher"] as const;
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
  priorities: z.array(z.enum(PRIORITIES)).max(3).default([]),
  wake_time: hhmm.nullable().default(null),
  sleep_time: hhmm.nullable().default(null),
  work_start: hhmm.nullable().default(null),
  work_end: hhmm.nullable().default(null),
  free_days: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  monthly_income: z.number().min(0).max(100_000_000).nullable().default(null),
  monthly_budget: z.number().min(0).max(100_000_000).nullable().default(null),
  diet_goal: z.enum(DIET_GOALS).nullable().default(null),
  activity_level: z.enum(ACTIVITY_LEVELS).nullable().default(null),
  dietary_restrictions: z.array(z.enum(RESTRICTIONS)).max(8).default([]),
}).superRefine((value, ctx) => {
  if (!value.health_consent && ([value.weight_kg, value.height_cm, value.age, value.sex, value.diet_goal, value.activity_level].some(v => v !== null) || value.dietary_restrictions.length > 0)) {
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