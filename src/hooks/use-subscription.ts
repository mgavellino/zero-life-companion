import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { highestPlan, planFromProduct, type PlanId } from "@/lib/plans";
import { bestSubscription, graceEndsAt, subscriptionGrantsAccess, type SubRow } from "@/lib/entitlement";

export type Sub = SubRow & { price_id: string; cancel_at_period_end: boolean | null };

export function useSubscription() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("status,product_id,price_id,current_period_end,cancel_at_period_end,past_due_since,created_at")
        .eq("user_id", u.user.id)
        .eq("environment", getPaddleEnvironment());
      const { data: g } = await supabase.from("plan_grants").select("plan,expires_at,is_trial").eq("user_id", u.user.id).is("revoked_at", null);
      const valid = ((g ?? []) as unknown as { plan: string; expires_at: string | null; is_trial?: boolean }[]).filter((x) => !x.expires_at || new Date(x.expires_at) > new Date());
      return { sub: bestSubscription((data ?? []) as Sub[]), hasHistory: (data ?? []).length > 0 || (g ?? []).some((x) => (x as { is_trial?: boolean }).is_trial), grants: valid.map((x) => x.plan as PlanId), trialGrants: valid.filter((x) => x.is_trial).map((x) => x.plan as PlanId) };
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`sub-changes-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => qc.invalidateQueries({ queryKey: ["subscription"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_grants" }, () => qc.invalidateQueries({ queryKey: ["subscription"] }))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
  const sub = q.data?.sub ?? null;
  const grants = q.data?.grants ?? [];
  const active = subscriptionGrantsAccess(sub);
  const plan: PlanId = highestPlan(active ? planFromProduct(sub?.product_id) : "free", ...grants);
  const subPlan = active ? planFromProduct(sub?.product_id) : "free";
  const tg = q.data?.trialGrants ?? [];
  const fullGrant = grants.filter((x) => x === plan).length > tg.filter((x) => x === plan).length;
  const trial = plan !== "free" && !fullGrant && (plan === subPlan ? sub?.status === "trialing" : tg.includes(plan));
  const subPlanActive = active && plan === subPlan;
  return { sub, active, plan, trial, subPlanActive, graceEnd: graceEndsAt(sub), hasHistory: q.data?.hasHistory ?? false, granted: grants.length > 0, loading: q.isLoading };
}
