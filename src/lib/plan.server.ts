import type { SupabaseClient } from "@supabase/supabase-js";
import { planFromProduct, type PlanId } from "@/lib/plans";
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
  return live ? planFromProduct(sub.product_id) : "free";
}
