import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { highestPlan, planFromProduct, type PlanId } from "@/lib/plans";

export type Sub = { status: string; product_id: string; price_id: string; current_period_end: string | null; cancel_at_period_end: boolean | null };

function isActive(s: Sub | null) {
  if (!s) return false;
  const future = !s.current_period_end || new Date(s.current_period_end) > new Date();
  if (["active", "trialing", "past_due"].includes(s.status)) return future;
  return s.status === "canceled" && !!s.current_period_end && new Date(s.current_period_end) > new Date();
}

export function useSubscription() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("status,product_id,price_id,current_period_end,cancel_at_period_end")
        .eq("user_id", u.user.id)
        .eq("environment", getPaddleEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: g } = await supabase.from("plan_grants").select("plan,expires_at,is_trial").eq("user_id", u.user.id).is("revoked_at", null);
      const valid = ((g ?? []) as unknown as { plan: string; expires_at: string | null; is_trial?: boolean }[]).filter((x) => !x.expires_at || new Date(x.expires_at) > new Date());
      return { sub: (data as Sub | null) ?? null, grants: valid.map((x) => x.plan as PlanId), trialGrants: valid.filter((x) => x.is_trial).map((x) => x.plan as PlanId) };
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
  const active = isActive(sub);
  const plan: PlanId = highestPlan(active ? planFromProduct(sub?.product_id) : "free", ...grants);
  const subPlan = active ? planFromProduct(sub?.product_id) : "free";
  const tg = q.data?.trialGrants ?? [];
  const fullGrant = grants.filter((x) => x === plan).length > tg.filter((x) => x === plan).length;
  const trial = plan !== "free" && !fullGrant && (plan === subPlan ? sub?.status === "trialing" : tg.includes(plan));
  return { sub, active, plan, trial, granted: grants.length > 0, loading: q.isLoading };
}
