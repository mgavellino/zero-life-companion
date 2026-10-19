export type Cycle = "monthly" | "semiannual" | "yearly";
export type PlanId = "free" | "essencial" | "pro" | "max";

export const TRIAL_DAYS = 7;
export const FREE_DAILY_MESSAGES = 20;

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
  return plan === "pro" || plan === "max";
}

export function hasUnlimitedChat(plan: PlanId) {
  return plan !== "free";
}
