import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Page, Card } from "@/components/Page";
import { PricingTable } from "@/components/PricingTable";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSubscription } from "@/hooks/use-subscription";
import { cancelSubscription, createPortalSession } from "@/utils/payments.functions";
import { getPaddleEnvironment } from "@/lib/paddle";
import { PrivacyControls } from "@/components/PrivacyControls";
import { PushSettings } from "@/components/PushSettings";
import { InstallZero } from "@/components/InstallZero";

export const Route = createFileRoute("/_authenticated/conta")({
  staticData: { sitemap: false },
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
  const { plan, sub, trial, subPlanActive, graceEnd } = useSubscription();
  const portal = useServerFn(createPortalSession);
  const cancel = useServerFn(cancelSubscription);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const canCancel = !!sub && sub.status !== "canceled" && subPlanActive && !sub.cancel_at_period_end;

  async function handleCancel() {
    setBusy(true);
    try {
      const result = await cancel({ data: { environment: getPaddleEnvironment() } });
      toast.success(result.alreadyScheduled ? t("billing.cancelScheduled") : t("billing.cancelSuccess"));
      setCancelOpen(false);
    } catch {
      toast.error(t("billing.cancelFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title={t("account.title")} kicker={t("account.kicker")}>
      <Card className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("account.current")}</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {plan === "free" ? t("pricing.freeName") : LABEL[plan]} {trial && <span className="ml-2 rounded-full bg-signal px-2 py-0.5 text-xs text-signal-foreground">{t("account.trial")}</span>}
          </p>
          {sub?.current_period_end && subPlanActive && sub.status !== "past_due" && (
            <p className="text-sm text-muted-foreground">
              {t(sub.cancel_at_period_end || sub.status === "canceled" ? "account.accessUntil" : "account.nextBilling", { value: new Date(sub.current_period_end).toLocaleDateString() })}
            </p>
          )}
          {sub?.cancel_at_period_end && (
            <p className="mt-1 text-sm text-muted-foreground">{t("billing.cancelScheduled")}</p>
          )}
          {sub?.status === "past_due" && <p className="mt-1 text-sm text-destructive">{graceEnd && graceEnd > new Date() ? t("billing.grace", { value: graceEnd.toLocaleDateString() }) : t("account.pastDue")}</p>}
        </div>
        {sub && (
          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={busy}>{t("billing.cancelSubscription")}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("billing.cancelConfirm")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("billing.cancelDescription")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy}>{t("common.cancel", { defaultValue: t("cancel", { defaultValue: "Cancel" }) })}</AlertDialogCancel>
                    <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void handleCancel(); }}>
                      {t("billing.cancelConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const url = await portal({ data: { environment: getPaddleEnvironment() } });
                  window.open(url, "_blank");
                } catch {
                  toast.error(t("account.error"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("billing.manage")}
            </Button>
          </div>
        )}
      </Card>
      <PricingTable />
      <PushSettings />
      <div className="my-4"><InstallZero /></div>
      <PrivacyControls />
    </Page>
  );
}
