import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Page, Card } from "@/components/Page";
import { PricingTable } from "@/components/PricingTable";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { createPortalSession } from "@/utils/payments.functions";
import { getPaddleEnvironment } from "@/lib/paddle";
import { PrivacyControls } from "@/components/PrivacyControls";
import { PushSettings } from "@/components/PushSettings";
import { InstallZero } from "@/components/InstallZero";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: i18n.t("account.metaTitle") },
      { name: "description", content: i18n.t("account.metaDescription") },
      { property: "og:title", content: i18n.t("account.metaTitle") },
      { property: "og:description", content: i18n.t("account.metaDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Conta,
});

const LABEL = { essencial: "Essencial", pro: "Pro", max: "Max" } as const;

function Conta() {
  const { t } = useTranslation();
  const { plan, sub } = useSubscription();
  const portal = useServerFn(createPortalSession);
  const [busy, setBusy] = useState(false);
  return (
    <Page title={t("account.title")} kicker={t("account.kicker")}>
      <Card className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("account.current")}</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {plan === "free" ? t("pricing.freeName") : LABEL[plan]} {sub?.status === "trialing" && <span className="ml-2 rounded-full bg-signal px-2 py-0.5 text-xs text-signal-foreground">{t("account.trial")}</span>}
          </p>
          {sub?.current_period_end && plan !== "free" && (
            <p className="text-sm text-muted-foreground">
              {t(sub.cancel_at_period_end || sub.status === "canceled" ? "account.accessUntil" : "account.nextBilling", { value: new Date(sub.current_period_end).toLocaleDateString() })}
            </p>
          )}
          {sub?.status === "past_due" && <p className="mt-1 text-sm text-destructive">{t("account.pastDue")}</p>}
        </div>
        {sub && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const url = await portal({ data: { environment: getPaddleEnvironment() } });
                window.open(url, "_blank");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : t("account.error"));
              } finally {
                setBusy(false);
              }
            }}
          >
            Gerenciar assinatura
          </Button>
        )}
      </Card>
      <PricingTable currentPlan={plan} />
      <PushSettings />
      <div className="my-4"><InstallZero /></div>
      <PrivacyControls />
    </Page>
  );
}
