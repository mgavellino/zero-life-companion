import type { SupabaseClient } from "@supabase/supabase-js";
import { highestPlan, planFromProduct, type PlanId } from "@/lib/plans";
import { serverPaddleEnv } from "@/lib/paddle.server";

// Resolves the caller's current plan from their latest live subscription (RLS-scoped client).
export async function getUserPlan(sb: SupabaseClient, userId: string): Promise<PlanId> {
  const { data: sub } = await sb
    .from("subscriptions")
    .select("product_id,status,current_period_end")
    .eq("user_id", userId)
    .eq("environment", serverPaddleEnv())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const live = sub && ["active", "trialing", "past_due", "canceled"].includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  const { data: grants } = await sb
    .from("plan_grants")
    .select("plan,expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null);
  const granted = (grants ?? [])
    .filter((g: { expires_at: string | null }) => !g.expires_at || new Date(g.expires_at) > new Date())
    .map((g: { plan: string }) => g.plan as PlanId);
  return highestPlan(live ? planFromProduct(sub.product_id) : "free", ...granted);
}
