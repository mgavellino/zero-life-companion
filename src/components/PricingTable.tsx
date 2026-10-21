import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { initializePaddle, getPaddleEnvironment } from "@/lib/paddle";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { changePlan, resolveCheckoutPrice } from "@/utils/payments.functions";
import { useSubscription } from "@/hooks/use-subscription";
import { brl, CYCLE_MONTHS, perMonth, PRICES, priceId, savingsPct, TRIAL_DAYS, FREE_DAILY_MESSAGES, type Cycle, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PricingTable({ currentPlan: forced }: { currentPlan?: PlanId }) {
  const { t, i18n } = useTranslation();
  const { sub, subPlanActive, plan: effective, hasHistory, loading: subLoading } = useSubscription();
  const currentPlan = forced ?? (subLoading ? undefined : effective);
  const paying = subPlanActive && sub?.status !== "canceled";
  const currentPrice = paying ? sub?.price_id?.replace(/_direct$/, "") : undefined;
  const resolve = useServerFn(resolveCheckoutPrice);
  const change = useServerFn(changePlan);
  const qc = useQueryClient();
  useEffect(() => {
    const done = () => { toast.success(t("billing.checkoutDone")); qc.invalidateQueries({ queryKey: ["subscription"] }); };
    window.addEventListener("zero:checkout-completed", done);
    return () => window.removeEventListener("zero:checkout-completed", done);
  }, [qc, t]);
  const PLANS = ([{ id: "essencial", name: "Essencial" }, { id: "pro", name: "Pro", featured: true }, { id: "max", name: "Max" }] as const).map((p) => ({ ...p, featured: "featured" in p && p.featured, tag: t(`pricing.${p.id}.tag`), features: t(`pricing.${p.id}.features`) as unknown as string[] }));
  const CYCLES = (["monthly", "semiannual", "yearly"] as const).map((id) => ({ id, label: t(`pricing.${id}`) }));
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  async function choose(plan: Exclude<PlanId, "free">) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return navigate({ to: "/auth" });
    const id = priceId(plan, cycle);
    setLoading(id);
    try {
      if (paying) {
        if (sub?.status === "past_due") { toast.error(t("billing.pastDueBlock")); return; }
        if (!window.confirm(t("billing.confirmChange", { plan: plan.charAt(0).toUpperCase() + plan.slice(1) }))) return;
        await change({ data: { priceId: id, environment: getPaddleEnvironment() } });
        toast.success(t("billing.changed"));
        setTimeout(() => qc.invalidateQueries({ queryKey: ["subscription"] }), 3000);
        return;
      }
      const r = await resolve({ data: { priceId: id, environment: getPaddleEnvironment() } });
      if (r.mode === "change" || !r.paddlePriceId) { qc.invalidateQueries({ queryKey: ["subscription"] }); return; }
      await initializePaddle();
      const lang = (i18n.language || "pt").slice(0, 2);
      window.Paddle.Checkout.open({
        items: [{ priceId: r.paddlePriceId, quantity: 1 }],
        customer: data.user.email ? { email: data.user.email } : undefined,
        customData: { userId: data.user.id },
        settings: { displayMode: "overlay", successUrl: `${window.location.origin}/conta?checkout=success`, allowLogout: false, variant: "one-page", locale: lang === "pt" ? "pt-BR" : lang },
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m.includes("PAST_DUE") ? t("billing.pastDueBlock") : m.includes("CHANGE_FAILED") ? t("billing.changeFailed") : t("pricing.paymentError"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="mx-auto mb-10 flex w-fit rounded-full border bg-card p-1">
        {CYCLES.map((c) => (
          <button key={c.id} onClick={() => setCycle(c.id)} className={cn("relative rounded-full px-4 py-2 text-sm font-medium", cycle === c.id ? "bg-ink text-background dark:bg-signal dark:text-signal-foreground" : "text-muted-foreground")}>
            {c.label}
            {c.id !== "monthly" && <span className="ml-1.5 rounded-full bg-signal px-1.5 py-0.5 text-[10px] font-bold text-signal-foreground">-{savingsPct("pro", c.id)}%</span>}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <div className="flex flex-col rounded-3xl border bg-card p-6">
          <p className="font-display text-lg font-semibold">{t("pricing.freeName")}</p>
          <p className="text-sm text-muted-foreground">{t("pricing.freeTag")}</p>
          <p className="mt-6 font-display text-4xl font-semibold">{t("pricing.zeroPrice")}</p>
          <p className="text-xs text-muted-foreground">{t("pricing.forever")}</p>
          <ul className="mt-6 flex-1 space-y-2 text-sm">
            {(t("pricing.freeFeatures", { value: FREE_DAILY_MESSAGES }) as unknown as string[]).map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{f}</li>
            ))}
          </ul>
          <Button variant="outline" className="mt-6" disabled={currentPlan === "free"} onClick={() => navigate({ to: paying ? "/conta" : "/auth" })}>
            {currentPlan === "free" ? t("pricing.current") : paying ? t("billing.downgradeFree") : t("pricing.startFree")}
          </Button>
        </div>

        {PLANS.map((p) => {
          const full = PRICES[p.id].monthly * CYCLE_MONTHS[cycle];
          const now = PRICES[p.id][cycle];
          return (
            <div key={p.id} className={cn("relative flex flex-col rounded-3xl border p-6", p.featured ? "border-transparent bg-ink text-background shadow-2xl lg:-mt-4 lg:pb-10 dark:bg-card dark:text-foreground dark:ring-2 dark:ring-signal" : "bg-card")}>
              {p.featured && <span className="absolute -top-3 left-6 rounded-full bg-signal px-3 py-1 text-xs font-bold text-signal-foreground">{t("pricing.popular")}</span>}
              <p className="font-display text-lg font-semibold">{p.name}</p>
              <p className={cn("text-sm", p.featured ? "opacity-70" : "text-muted-foreground")}>{p.tag}</p>
              <div className="mt-6 flex min-w-0 flex-wrap items-baseline gap-2">
                <p className="font-display text-3xl font-semibold xl:text-4xl">{brl(perMonth(p.id, cycle))}</p>
                <span className="text-sm opacity-60">{t("pricing.perMonth")}</span>
              </div>
              {cycle === "monthly" ? (
                <p className="text-xs opacity-60">{t("pricing.billedMonthly")}</p>
              ) : (
                <p className="text-xs">
                  <span className="line-through opacity-50">{brl(full)}</span> <span className="font-semibold">{brl(now)}</span>
                  <span className="opacity-60">{t("pricing.billing", { value: CYCLE_MONTHS[cycle] })}</span>
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-signal" />{f}</li>
                ))}
              </ul>
              <Button
                className={cn("mt-6 h-11", p.featured && "bg-signal text-signal-foreground hover:bg-signal/90")}
                variant={p.featured ? "default" : "outline"}
                disabled={loading === priceId(p.id, cycle) || (paying ? currentPrice === priceId(p.id, cycle) : currentPlan === p.id)}
                onClick={() => choose(p.id)}
              >
                {paying ? (currentPrice === priceId(p.id, cycle) ? t("pricing.current") : t("billing.switch")) : currentPlan === p.id ? t("pricing.current") : hasHistory ? t("billing.subscribe") : t(TRIAL_DAYS / 30 === 1 ? "pricing.trialMonth" : "pricing.trialDays", { value: TRIAL_DAYS })}
              </Button>
              <p className="mt-2 text-center text-[11px] opacity-60">{t("pricing.cancel")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
