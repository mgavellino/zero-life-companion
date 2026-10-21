import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) _sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
  return _sb;
}

const PLAN_NAMES: Record<string, string> = { essencial_plan: "Essencial", pro_plan: "Pro", max_plan: "Max" };

/** Throws on DB errors so the request fails and the payment provider retries. */
function must<T extends { error: { message: string } | null }>(r: T, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r;
}

async function notify(userId: string, title: string, body: string, link = "/conta") {
  const r = await sb().from("notifications").insert({ user_id: userId, title, body, kind: "billing", link } as never);
  if (r.error) console.error("billing notification", r.error.message); // never block the subscription write
}

type Existing = { user_id: string; status: string; product_id: string; past_due_since: string | null; last_event_at: string | null } | null;

/** Single writer for every subscription.* event: upserts the full row, ignores out-of-order events. */
async function syncSubscription(data: any, env: PaddleEnv, occurredAt: string, eventType: string) {
  const { id, customerId, items, status, currentBillingPeriod, scheduledChange, customData, canceledAt } = data;
  const existing = must(await sb().from("subscriptions").select("user_id,status,product_id,past_due_since,last_event_at").eq("paddle_subscription_id", id).maybeSingle(), "load subscription").data as Existing;
  if (existing?.last_event_at && new Date(existing.last_event_at) > new Date(occurredAt)) return console.log("Skipping stale event", eventType, id);
  const userId = existing?.user_id ?? customData?.userId;
  if (!userId) throw new Error(`No userId for subscription ${id}`);
  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId ?? existing?.product_id;
  if (!priceId || !productId) throw new Error(`Missing importMeta.externalId for ${id}`);
  const end = status === "canceled" ? (currentBillingPeriod?.endsAt ?? canceledAt ?? null) : (currentBillingPeriod?.endsAt ?? null);
  const pastDueSince = status === "past_due" ? (existing?.past_due_since ?? occurredAt) : null;
  must(
    await sb().from("subscriptions").upsert(
      {
        user_id: userId,
        paddle_subscription_id: id,
        paddle_customer_id: customerId,
        product_id: productId,
        price_id: priceId,
        status,
        current_period_start: currentBillingPeriod?.startsAt ?? null,
        current_period_end: end,
        cancel_at_period_end: scheduledChange?.action === "cancel",
        past_due_since: pastDueSince,
        last_event_at: occurredAt,
        environment: env,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "paddle_subscription_id" },
    ),
    "upsert subscription",
  );
  const name = PLAN_NAMES[productId] ?? "";
  if (!existing) await notify(userId, `Plano ${name} ativado`, status === "trialing" ? "Seu teste grátis de 1 mês começou. Aproveite tudo!" : "Obrigado por assinar o Zero.");
  else if (existing.product_id !== productId) await notify(userId, `Plano alterado para ${name}`, "A mudança já vale agora. A diferença foi cobrada de forma proporcional.");
  else if (status === "past_due" && existing.status !== "past_due") await notify(userId, "Pagamento não aprovado", "Atualize seu cartão em Conta → Gerenciar assinatura. Você mantém o plano por 7 dias.");
  else if (status === "canceled" && existing.status !== "canceled") await notify(userId, "Assinatura cancelada", end ? `Você mantém o plano ${name} até ${new Date(end).toLocaleDateString("pt-BR")}.` : "Seu plano voltou para o Grátis.");
  else if (status === "active" && existing.status === "past_due") await notify(userId, "Pagamento aprovado", "Tudo certo, seu plano continua ativo.");
}

async function onPaymentFailed(data: any) {
  const subId = data?.subscriptionId;
  if (!subId) return;
  const { data: row } = await sb().from("subscriptions").select("user_id").eq("paddle_subscription_id", subId).maybeSingle();
  if (row) await notify((row as { user_id: string }).user_id, "Pagamento não aprovado", "Atualize seu cartão em Conta → Gerenciar assinatura. Você mantém o plano por 7 dias.");
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = (new URL(request.url).searchParams.get("env") === "live" ? "live" : "sandbox") as PaddleEnv;
        let event;
        try {
          event = await verifyWebhook(request, env);
        } catch (e) {
          console.error("Webhook signature error:", e);
          return new Response("Invalid signature", { status: 401 });
        }
        try {
          const t = event.eventType as string;
          if (t.startsWith("subscription.")) await syncSubscription(event.data, env, event.occurredAt, t);
          else if (t === EventName.TransactionPaymentFailed) await onPaymentFailed(event.data);
          else console.log("Unhandled event:", t);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook processing error:", e);
          return new Response("Webhook processing error", { status: 500 });
        }
      },
    },
  },
});
