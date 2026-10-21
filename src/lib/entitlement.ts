import { highestPlan, planFromProduct, type PlanId } from "@/lib/plans";

/** Browser-safe paid-access rules shared by the server plan resolver and the client hook. */
export const PAST_DUE_GRACE_DAYS = 7;

export type SubRow = { status: string; product_id: string; price_id?: string; current_period_end: string | null; cancel_at_period_end?: boolean | null; past_due_since?: string | null; created_at?: string | null };

export function subscriptionGrantsAccess(s: SubRow | null | undefined, now = new Date()): boolean {
  if (!s) return false;
  const end = s.current_period_end ? new Date(s.current_period_end) : null;
  if (s.status === "active" || s.status === "trialing") return !end || end > now;
  if (s.status === "past_due") {
    const since = s.past_due_since ? new Date(s.past_due_since) : end;
    return !!since && now.getTime() - since.getTime() < PAST_DUE_GRACE_DAYS * 86400000;
  }
  if (s.status === "canceled") return !!end && end > now;
  return false; // paused or unknown
}

/** Best subscription among all rows (a user can hold several during plan changes). */
export function bestSubscription<T extends SubRow>(rows: T[], now = new Date()): T | null {
  const live = rows.filter((r) => subscriptionGrantsAccess(r, now));
  const pool = live.length ? live : rows;
  return [...pool].sort((a, b) => {
    const p = PLAN_RANK[planFromProduct(b.product_id)] - PLAN_RANK[planFromProduct(a.product_id)];
    return live.length && p ? p : String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  })[0] ?? null;
}

const PLAN_RANK: Record<PlanId, number> = { free: 0, essencial: 1, pro: 2, max: 3 };

export function effectivePlan(rows: SubRow[], grants: { plan: string; expires_at: string | null }[], now = new Date()): PlanId {
  const s = bestSubscription(rows, now);
  const subPlan = subscriptionGrantsAccess(s, now) ? planFromProduct(s?.product_id) : "free";
  const granted = grants.filter((g) => !g.expires_at || new Date(g.expires_at) > now).map((g) => g.plan as PlanId);
  return highestPlan(subPlan, ...granted);
}

/** One free trial per person: anyone with any past subscription or trial grant pays directly. */
export function trialEligible(subCount: number, trialGrantCount: number) {
  return subCount === 0 && trialGrantCount === 0;
}

export function graceEndsAt(s: SubRow | null | undefined): Date | null {
  if (!s || s.status !== "past_due") return null;
  const since = s.past_due_since ? new Date(s.past_due_since) : s.current_period_end ? new Date(s.current_period_end) : null;
  return since ? new Date(since.getTime() + PAST_DUE_GRACE_DAYS * 86400000) : null;
}
