import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { brl, CYCLE_MONTHS, perMonth, PRICES, priceId, savingsPct, TRIAL_DAYS, FREE_DAILY_MESSAGES, type Cycle, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS: { id: Exclude<PlanId, "free">; name: string; tag: string; features: string[]; featured?: boolean }[] = [
  { id: "essencial", name: "Essencial", tag: "Para organizar a vida", features: ["Chat ilimitado com o assistente", "Tempo, dinheiro e dieta automáticos", "Lembretes e notificações", "Voz do navegador"] },
  { id: "pro", name: "Pro", tag: "O mais escolhido", featured: true, features: ["Tudo do Essencial", "Voz premium ultra-realista", "Conversa por voz contínua", "Resumos e alertas proativos"] },
  { id: "max", name: "Max", tag: "Para quem quer o máximo", features: ["Tudo do Pro", "Relatórios avançados de dinheiro e tempo", "Prioridade nas respostas", "Suporte prioritário"] },
];

const CYCLES: { id: Cycle; label: string }[] = [
  { id: "monthly", label: "Mensal" },
  { id: "semiannual", label: "Semestral" },
  { id: "yearly", label: "Anual" },
];

export function PricingTable({ currentPlan }: { currentPlan?: PlanId }) {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  async function choose(plan: Exclude<PlanId, "free">) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return navigate({ to: "/auth" });
    const id = priceId(plan, cycle);
    setLoading(id);
    try {
      await initializePaddle();
      const pid = await getPaddlePriceId(id);
      window.Paddle.Checkout.open({
        items: [{ priceId: pid, quantity: 1 }],
        customer: data.user.email ? { email: data.user.email } : undefined,
        customData: { userId: data.user.id },
        settings: { displayMode: "overlay", successUrl: `${window.location.origin}/chat?checkout=success`, allowLogout: false, variant: "one-page", locale: "pt-BR" },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o pagamento");
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

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="flex flex-col rounded-3xl border bg-card p-6">
          <p className="font-display text-lg font-semibold">Grátis</p>
          <p className="text-sm text-muted-foreground">Para experimentar</p>
          <p className="mt-6 font-display text-4xl font-semibold">R$ 0</p>
          <p className="text-xs text-muted-foreground">para sempre</p>
          <ul className="mt-6 flex-1 space-y-2 text-sm">
            {[`${FREE_DAILY_MESSAGES} mensagens por dia`, "Tempo, dinheiro e dieta", "Voz do navegador"].map((f) => (
              <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{f}</li>
            ))}
          </ul>
          <Button variant="outline" className="mt-6" disabled={currentPlan === "free"} onClick={() => navigate({ to: "/auth" })}>
            {currentPlan === "free" ? "Seu plano atual" : "Começar grátis"}
          </Button>
        </div>

        {PLANS.map((p) => {
          const full = PRICES[p.id].monthly * CYCLE_MONTHS[cycle];
          const now = PRICES[p.id][cycle];
          return (
            <div key={p.id} className={cn("relative flex flex-col rounded-3xl border p-6", p.featured ? "border-transparent bg-ink text-background shadow-2xl lg:-mt-4 lg:pb-10 dark:bg-card dark:text-foreground dark:ring-2 dark:ring-signal" : "bg-card")}>
              {p.featured && <span className="absolute -top-3 left-6 rounded-full bg-signal px-3 py-1 text-xs font-bold text-signal-foreground">Mais escolhido</span>}
              <p className="font-display text-lg font-semibold">{p.name}</p>
              <p className={cn("text-sm", p.featured ? "opacity-70" : "text-muted-foreground")}>{p.tag}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <p className="font-display text-4xl font-semibold">{brl(perMonth(p.id, cycle))}</p>
                <span className="text-sm opacity-60">/mês</span>
              </div>
              {cycle === "monthly" ? (
                <p className="text-xs opacity-60">cobrado mensalmente</p>
              ) : (
                <p className="text-xs">
                  <span className="line-through opacity-50">{brl(full)}</span> <span className="font-semibold">{brl(now)}</span>
                  <span className="opacity-60"> a cada {CYCLE_MONTHS[cycle]} meses</span>
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
                disabled={loading === priceId(p.id, cycle) || currentPlan === p.id}
                onClick={() => choose(p.id)}
              >
                {currentPlan === p.id ? "Seu plano atual" : `Testar ${TRIAL_DAYS / 30 === 1 ? "1 mês" : `${TRIAL_DAYS} dias`} grátis`}
              </Button>
              <p className="mt-2 text-center text-[11px] opacity-60">Cancele quando quiser antes da cobrança.</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
