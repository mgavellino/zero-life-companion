import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) _sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
  return _sb;
}

const PLAN_NAMES: Record<string, string> = { essencial_plan: "Essencial", pro_plan: "Pro", max_plan: "Max" };

async function notify(userId: string, title: string, body: string) {
  await sb().from("notifications").insert({ user_id: userId, title, body, kind: "billing", link: "/planos" } as never);
}

async function onCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) return console.error("No userId in customData");
  const item = items[0];
  const priceId = item.price.importMeta?.externalId;
  const productId = item.product.importMeta?.externalId;
  if (!priceId || !productId) return console.warn("Skipping subscription: missing importMeta.externalId");
  await sb().from("subscriptions").upsert(
    {
      user_id: userId,
      paddle_subscription_id: id,
      paddle_customer_id: customerId,
      product_id: productId,
      price_id: priceId,
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      environment: env,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "paddle_subscription_id" },
  );
  await notify(userId, `Plano ${PLAN_NAMES[productId] ?? ""} ativado`, status === "trialing" ? "Seu teste grátis começou. Aproveite tudo!" : "Obrigado por assinar o Zero.");
}

async function onUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;
  const item = items?.[0];
  await sb()
    .from("subscriptions")
    .update({
      status,
      ...(item?.price?.importMeta?.externalId ? { price_id: item.price.importMeta.externalId } : {}),
      ...(item?.product?.importMeta?.externalId ? { product_id: item.product.importMeta.externalId } : {}),
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === "cancel",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("paddle_subscription_id", id)
    .eq("environment", env);
}

async function onCanceled(data: any, env: PaddleEnv) {
  await sb()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() } as never)
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = (new URL(request.url).searchParams.get("env") === "live" ? "live" : "sandbox") as PaddleEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.eventType) {
            case EventName.SubscriptionCreated:
              await onCreated(event.data, env);
              break;
            case EventName.SubscriptionUpdated:
              await onUpdated(event.data, env);
              break;
            case EventName.SubscriptionCanceled:
              await onCanceled(event.data, env);
              break;
            default:
              console.log("Unhandled event:", event.eventType);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
