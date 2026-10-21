import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanId } from "@/lib/plans";
import { effectivePlan, type SubRow } from "@/lib/entitlement";
import { serverPaddleEnv } from "@/lib/paddle.server";

// Resolves the caller's plan from all their subscriptions + active grants (RLS-scoped client).
export async function getUserPlan(sb: SupabaseClient, userId: string): Promise<PlanId> {
  const { data: subs } = await sb
    .from("subscriptions")
    .select("product_id,status,current_period_end,past_due_since,created_at")
    .eq("user_id", userId)
    .eq("environment", serverPaddleEnv());
  const { data: grants } = await sb.from("plan_grants").select("plan,expires_at").eq("user_id", userId).is("revoked_at", null);
  return effectivePlan((subs ?? []) as SubRow[], (grants ?? []) as { plan: string; expires_at: string | null }[]);
}
