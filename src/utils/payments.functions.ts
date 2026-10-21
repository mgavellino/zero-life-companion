import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gatewayFetch, getPaddleClient, type PaddleEnv } from "@/lib/paddle.server";
import { bestSubscription, subscriptionGrantsAccess, trialEligible, type SubRow } from "@/lib/entitlement";

const envOf = (e: unknown): PaddleEnv => (e === "live" ? "live" : "sandbox");
const validPrice = (id: string) => /^(essencial|pro|max)_(monthly|semiannual|yearly)$/.test(id);

async function paddlePriceId(env: PaddleEnv, externalId: string) {
  const response = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(externalId)}`);
  if (!response.ok) throw new Error(`Price lookup failed [${response.status}]`);
  const result = await response.json();
  if (!result.data?.length) throw new Error("Price not found");
  return result.data[0].id as string;
}

type Row = SubRow & { paddle_subscription_id: string; paddle_customer_id: string };
async function loadSubs(context: { supabase: any; userId: string }, env: PaddleEnv) {
  const { data } = await context.supabase
    .from("subscriptions")
    .select("paddle_subscription_id,paddle_customer_id,status,product_id,price_id,current_period_end,past_due_since,created_at,cancel_at_period_end")
    .eq("user_id", context.userId)
    .eq("environment", env);
  return (data ?? []) as Row[];
}

/** Resolves the checkout price: trial price only for first-time subscribers. */
export const resolveCheckoutPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { priceId: string; environment: PaddleEnv }) => {
    if (!validPrice(d.priceId)) throw new Error("Invalid price");
    return { priceId: d.priceId, environment: envOf(d.environment) };
  })
  .handler(async ({ data, context }) => {
    const subs = await loadSubs(context, data.environment);
    if (subs.some((s) => subscriptionGrantsAccess(s))) return { mode: "change" as const, paddlePriceId: null, trial: false };
    const { count } = await context.supabase.from("plan_grants").select("id", { count: "exact", head: true }).eq("user_id", context.userId).eq("is_trial", true);
    const trial = trialEligible(subs.length, count ?? 0);
    return { mode: "checkout" as const, paddlePriceId: await paddlePriceId(data.environment, trial ? data.priceId : `${data.priceId}_direct`), trial };
  });

/** Immediate plan/cycle change with prorated charge on the existing subscription. */
export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { priceId: string; environment: PaddleEnv }) => {
    if (!validPrice(d.priceId)) throw new Error("Invalid price");
    return { priceId: d.priceId, environment: envOf(d.environment) };
  })
  .handler(async ({ data, context }) => {
    const sub = bestSubscription(await loadSubs(context, data.environment));
    if (!sub || !subscriptionGrantsAccess(sub) || sub.status === "canceled") throw new Error("NO_ACTIVE_SUBSCRIPTION");
    if (sub.status === "past_due") throw new Error("PAST_DUE");
    if (sub.price_id?.replace(/_direct$/, "") === data.priceId) return { ok: true };
    const pid = await paddlePriceId(data.environment, `${data.priceId}_direct`);
    try {
      await getPaddleClient(data.environment).subscriptions.update(sub.paddle_subscription_id, {
        items: [{ priceId: pid, quantity: 1 }],
        prorationBillingMode: sub.status === "trialing" ? "do_not_bill" : "prorated_immediately",
      });
    } catch (e) {
      console.error("changePlan", e);
      throw new Error("CHANGE_FAILED");
    }
    return { ok: true };
  });

/** Schedules cancellation at the end of the current billing period. */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) => ({ environment: envOf(data.environment) }))
  .handler(async ({ data, context }) => {
    const sub = bestSubscription(await loadSubs(context, data.environment));
    if (!sub || !sub.paddle_subscription_id || !subscriptionGrantsAccess(sub) || sub.status === "canceled") {
      throw new Error("NO_ACTIVE_SUBSCRIPTION");
    }
    if (sub.cancel_at_period_end) return { ok: true, alreadyScheduled: true };
    try {
      await getPaddleClient(data.environment).subscriptions.cancel(sub.paddle_subscription_id, {
        effectiveFrom: "next_billing_period",
      });
    } catch (e) {
      console.error("cancelSubscription", e);
      throw new Error("CANCEL_FAILED");
    }
    return { ok: true, alreadyScheduled: false };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) => ({ environment: envOf(data.environment) }))
  .handler(async ({ data, context }) => {
    const sub = bestSubscription(await loadSubs(context, data.environment));
    if (!sub) throw new Error("NO_SUBSCRIPTION");
    const session = await getPaddleClient(data.environment).customerPortalSessions.create(sub.paddle_customer_id, [sub.paddle_subscription_id]);
    return session.urls.general.overview;
  });
