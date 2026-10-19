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

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Meu plano — Zero" },
      { name: "description", content: "Gerencie sua assinatura do Zero." },
      { property: "og:title", content: "Meu plano — Zero" },
      { property: "og:description", content: "Gerencie sua assinatura do Zero." },
    ],
  }),
  component: Conta,
});

const LABEL = { free: "Grátis", essencial: "Essencial", pro: "Pro", max: "Max" } as const;

function Conta() {
  const { plan, sub } = useSubscription();
  const portal = useServerFn(createPortalSession);
  const [busy, setBusy] = useState(false);
  return (
    <Page title="Seu plano" kicker="Conta">
      <Card className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Plano atual</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {LABEL[plan]} {sub?.status === "trialing" && <span className="ml-2 rounded-full bg-signal px-2 py-0.5 text-xs text-signal-foreground">em teste</span>}
          </p>
          {sub?.current_period_end && plan !== "free" && (
            <p className="text-sm text-muted-foreground">
              {sub.cancel_at_period_end || sub.status === "canceled" ? "Acesso até " : "Próxima cobrança em "}
              {new Date(sub.current_period_end).toLocaleDateString()}
            </p>
          )}
          {sub?.status === "past_due" && <p className="mt-1 text-sm text-destructive">Pagamento pendente — atualize sua forma de pagamento.</p>}
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
                toast.error(e instanceof Error ? e.message : "Erro");
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
    </Page>
  );
}
