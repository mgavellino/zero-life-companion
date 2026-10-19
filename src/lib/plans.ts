export type Cycle = "monthly" | "semiannual" | "yearly";
export type PlanId = "free" | "essencial" | "pro" | "max";

export const TRIAL_DAYS = 30;
/** Per-plan limits. null = unlimited. */
export const LIMITS: Record<PlanId, { messagesPerDay: number | null; mealsPerDay: number | null; voiceChat: boolean; premiumVoice: boolean; proactive: boolean; reports: boolean }> = {
  free: { messagesPerDay: 5, mealsPerDay: 2, voiceChat: false, premiumVoice: false, proactive: false, reports: false },
  essencial: { messagesPerDay: 40, mealsPerDay: 5, voiceChat: true, premiumVoice: false, proactive: false, reports: false },
  pro: { messagesPerDay: 200, mealsPerDay: null, voiceChat: true, premiumVoice: true, proactive: true, reports: false },
  max: { messagesPerDay: null, mealsPerDay: null, voiceChat: true, premiumVoice: true, proactive: true, reports: true },
};
export const FREE_DAILY_MESSAGES = LIMITS.free.messagesPerDay as number;

export const CYCLE_MONTHS: Record<Cycle, number> = { monthly: 1, semiannual: 6, yearly: 12 };

/** Prices in BRL cents — must match the payment catalog. */
export const PRICES: Record<Exclude<PlanId, "free">, Record<Cycle, number>> = {
  essencial: { monthly: 990, semiannual: 4990, yearly: 8990 },
  pro: { monthly: 2190, semiannual: 10990, yearly: 19690 },
  max: { monthly: 3790, semiannual: 18990, yearly: 33990 },
};

export const PLAN_ORDER: PlanId[] = ["free", "essencial", "pro", "max"];

export function priceId(plan: Exclude<PlanId, "free">, cycle: Cycle) {
  return `${plan}_${cycle}`;
}

export function planFromProduct(productId: string | null | undefined): PlanId {
  if (productId === "essencial_plan") return "essencial";
  if (productId === "pro_plan") return "pro";
  if (productId === "max_plan") return "max";
  return "free";
}

/** Savings vs paying monthly for the same period, in percent (rounded). */
export function savingsPct(plan: Exclude<PlanId, "free">, cycle: Cycle) {
  const full = PRICES[plan].monthly * CYCLE_MONTHS[cycle];
  return Math.round((1 - PRICES[plan][cycle] / full) * 100);
}

export function perMonth(plan: Exclude<PlanId, "free">, cycle: Cycle) {
  return PRICES[plan][cycle] / CYCLE_MONTHS[cycle];
}

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Premium ElevenLabs voice is a Pro/Max feature. */
export function hasPremiumVoice(plan: PlanId) {
  return LIMITS[plan].premiumVoice;
}

export function hasUnlimitedChat(plan: PlanId) {
  return LIMITS[plan].messagesPerDay === null;
}

export function hasVoiceChat(plan: PlanId) {
  return LIMITS[plan].voiceChat;
}

/** Highest of several plans (subscription vs admin grant). */
export function highestPlan(...plans: PlanId[]): PlanId {
  return plans.reduce((a, b) => (PLAN_ORDER.indexOf(b) > PLAN_ORDER.indexOf(a) ? b : a), "free" as PlanId);
}

/** AI model per plan: Pro/Max get the stronger model. */
export function modelFor(plan: PlanId) {
  return plan === "pro" || plan === "max" ? "openai/gpt-oss-120b" : "openai/gpt-oss-20b";
}
