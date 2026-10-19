import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { planFromProduct, type PlanId } from "@/lib/plans";

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
      return (data as Sub | null) ?? null;
    },
  });
  useEffect(() => {
    const ch = supabase
      .channel(`sub-changes-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => qc.invalidateQueries({ queryKey: ["subscription"] }))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
  const sub = q.data ?? null;
  const active = isActive(sub);
  const plan: PlanId = active ? planFromProduct(sub?.product_id) : "free";
  return { sub, active, plan, loading: q.isLoading };
}
