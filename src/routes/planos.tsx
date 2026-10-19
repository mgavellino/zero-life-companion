import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Prefs } from "@/components/Prefs";
import { PricingTable } from "@/components/PricingTable";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — Zero, seu assistente pessoal" },
      { name: "description", content: "Escolha seu plano do Zero. 1 mês grátis, planos mensais, semestrais e anuais a partir de R$ 9,90." },
      { property: "og:title", content: "Planos do Zero — 1 mês grátis" },
      { property: "og:description", content: "Assistente pessoal para tempo, dinheiro e corpo. Planos a partir de R$ 9,90." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Planos,
});

function Planos() {
  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/"><Logo /></Link>
        <div className="flex items-center gap-2">
          <Prefs />
          <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <p className="text-center font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">Planos</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-center text-4xl font-semibold md:text-6xl">Menos do que um café por semana.</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">Comece com 1 mês grátis em qualquer plano. Cancele quando quiser.</p>
        <div className="mt-12"><PricingTable /></div>
      </main>
    </div>
  );
}
