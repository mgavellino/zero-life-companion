import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) _sb = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
  return _sb;
}

const PLAN_NAMES: Record<string, string> = { essencial_plan: "Essencial", pro_plan: "Pro", max_plan: "Max" };

/** Preserve webhook retry semantics for database failures. */
function must<T extends { error: { message: string } | null }>(result: T, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  return result;
}

type BillingNotice = "activated" | "trial" | "changed" | "paymentFailed" | "canceled" | "paymentRecovered";

const NOTICE_TEXT: Record<string, Record<BillingNotice, (plan?: string, date?: string) => { title: string; body: string }>> = {
  pt: {
    activated: (p) => ({ title: `Plano ${p} ativado`, body: "Obrigado por assinar o Zero." }),
    trial: (p) => ({ title: `Plano ${p} ativado`, body: "Seu teste grátis de 1 mês começou. Aproveite tudo!" }),
    changed: (p) => ({ title: `Plano alterado para ${p}`, body: "A mudança já vale agora. A diferença foi cobrada de forma proporcional." }),
    paymentFailed: () => ({ title: "Pagamento não aprovado", body: "Atualize seu cartão em Conta → Gerenciar assinatura. Você mantém o plano por 7 dias." }),
    canceled: (p, d) => ({ title: "Assinatura cancelada", body: d ? `Você mantém o plano ${p} até ${d}.` : "Seu plano voltou para o Grátis." }),
    paymentRecovered: () => ({ title: "Pagamento aprovado", body: "Tudo certo, seu plano continua ativo." }),
  },
  en: {
    activated: (p) => ({ title: `${p} plan activated`, body: "Thanks for subscribing to Zero." }),
    trial: (p) => ({ title: `${p} plan activated`, body: "Your 1-month free trial has started. Enjoy!" }),
    changed: (p) => ({ title: `Plan changed to ${p}`, body: "The change is effective now. The remaining-period difference was prorated." }),
    paymentFailed: () => ({ title: "Payment unsuccessful", body: "Update your card in Account → Manage subscription. Your plan remains available for 7 days." }),
    canceled: (p, d) => ({ title: "Subscription canceled", body: d ? `Your ${p} plan remains active until ${d}.` : "Your plan has returned to Free." }),
    paymentRecovered: () => ({ title: "Payment successful", body: "All set. Your plan is active again." }),
  },
  es: {
    activated: (p) => ({ title: `Plan ${p} activado`, body: "Gracias por suscribirte a Zero." }),
    trial: (p) => ({ title: `Plan ${p} activado`, body: "Tu prueba gratuita de 1 mes ha comenzado. ¡Disfrútala!" }),
    changed: (p) => ({ title: `Plan cambiado a ${p}`, body: "El cambio ya está activo. La diferencia se cobró proporcionalmente." }),
    paymentFailed: () => ({ title: "Pago rechazado", body: "Actualiza tu tarjeta en Cuenta → Gestionar suscripción. Mantendrás el plan durante 7 días." }),
    canceled: (p, d) => ({ title: "Suscripción cancelada", body: d ? `Mantendrás el plan ${p} hasta el ${d}.` : "Tu plan ha vuelto al nivel Gratis." }),
    paymentRecovered: () => ({ title: "Pago aprobado", body: "Todo listo. Tu plan vuelve a estar activo." }),
  },
  fr: {
    activated: (p) => ({ title: `Forfait ${p} activé`, body: "Merci d'avoir choisi Zero." }),
    trial: (p) => ({ title: `Forfait ${p} activé`, body: "Votre essai gratuit d'un mois a commencé. Profitez-en !" }),
    changed: (p) => ({ title: `Forfait changé : ${p}`, body: "Le changement est actif. La différence a été calculée au prorata." }),
    paymentFailed: () => ({ title: "Paiement refusé", body: "Mettez à jour votre carte dans Compte → Gérer l'abonnement. Votre forfait reste actif pendant 7 jours." }),
    canceled: (p, d) => ({ title: "Abonnement résilié", body: d ? `Votre forfait ${p} reste actif jusqu'au ${d}.` : "Votre forfait est repassé en version gratuite." }),
    paymentRecovered: () => ({ title: "Paiement accepté", body: "Tout est en ordre. Votre forfait est de nouveau actif." }),
  },
  de: {
    activated: (p) => ({ title: `${p}-Tarif aktiviert`, body: "Danke, dass du Zero abonniert hast." }),
    trial: (p) => ({ title: `${p}-Tarif aktiviert`, body: "Dein einmonatiger kostenloser Test hat begonnen. Viel Spaß!" }),
    changed: (p) => ({ title: `Tarif geändert: ${p}`, body: "Die Änderung ist jetzt aktiv. Die Differenz wurde anteilig berechnet." }),
    paymentFailed: () => ({ title: "Zahlung fehlgeschlagen", body: "Aktualisiere deine Karte unter Konto → Abo verwalten. Dein Tarif bleibt 7 Tage verfügbar." }),
    canceled: (p, d) => ({ title: "Abo gekündigt", body: d ? `Dein Tarif ${p} bleibt bis zum ${d} aktiv.` : "Dein Tarif wurde auf Kostenlos zurückgesetzt." }),
    paymentRecovered: () => ({ title: "Zahlung erfolgreich", body: "Alles erledigt. Dein Tarif ist wieder aktiv." }),
  },
  it: {
    activated: (p) => ({ title: `Piano ${p} attivato`, body: "Grazie per aver scelto Zero." }),
    trial: (p) => ({ title: `Piano ${p} attivato`, body: "È iniziata la prova gratuita di 1 mese. Buon divertimento!" }),
    changed: (p) => ({ title: `Piano cambiato in ${p}`, body: "La modifica è attiva. La differenza è stata calcolata proporzionalmente." }),
    paymentFailed: () => ({ title: "Pagamento non riuscito", body: "Aggiorna la carta in Account → Gestisci abbonamento. Il piano resta disponibile per 7 giorni." }),
    canceled: (p, d) => ({ title: "Abbonamento annullato", body: d ? `Il piano ${p} resta attivo fino al ${d}.` : "Il tuo piano è tornato alla versione gratuita." }),
    paymentRecovered: () => ({ title: "Pagamento riuscito", body: "Tutto a posto. Il piano è di nuovo attivo." }),
  },
};

async function languageFor(userId: string): Promise<string> {
  try {
    const { data } = await sb().auth.admin.getUserById(userId);
    const lang = data.user?.user_metadata?.["language"];
    if (typeof lang === "string" && NOTICE_TEXT[lang]) return lang;
  } catch (e) {
    console.error("billing language lookup failed");
  }
  return "pt";
}

async function notifyBilling(userId: string, kind: BillingNotice, plan = "", date?: string) {
  const lang = await languageFor(userId);
  const message = (NOTICE_TEXT[lang] ?? NOTICE_TEXT["pt"])![kind](plan, date);
  const r = await sb().from("notifications").insert({ user_id: userId, title: message.title, body: message.body, kind: "billing", link: "/conta" } as never);
  if (r.error) console.error("billing notification", r.error.message);
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
  must(await sb().from("subscriptions").upsert({
    user_id: userId, paddle_subscription_id: id, paddle_customer_id: customerId,
    product_id: productId, price_id: priceId, status,
    current_period_start: currentBillingPeriod?.startsAt ?? null,
    current_period_end: end, cancel_at_period_end: scheduledChange?.action === "cancel",
    past_due_since: pastDueSince, last_event_at: occurredAt, environment: env, updated_at: new Date().toISOString(),
  } as never, { onConflict: "paddle_subscription_id" }), "upsert subscription");

  const name = PLAN_NAMES[productId] ?? "";
  if (!existing) await notifyBilling(userId, status === "trialing" ? "trial" : "activated", name);
  else if (existing.product_id !== productId) await notifyBilling(userId, "changed", name);
  else if (status === "past_due" && existing.status !== "past_due") await notifyBilling(userId, "paymentFailed");
  else if (status === "canceled" && existing.status !== "canceled") {
    const lang = await languageFor(userId);
    const date = end ? new Date(end).toLocaleDateString(lang === "pt" ? "pt-BR" : lang) : undefined;
    await notifyBilling(userId, "canceled", name, date);
  } else if (status === "active" && existing.status === "past_due") await notifyBilling(userId, "paymentRecovered");
}

async function onPaymentFailed(data: any) {
  const subId = data?.subscriptionId;
  if (!subId) return;
  const { data: row } = must(await sb().from("subscriptions").select("user_id").eq("paddle_subscription_id", subId).maybeSingle(), "load failed-payment subscription");
  if (row) await notifyBilling((row as { user_id: string }).user_id, "paymentFailed");
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
