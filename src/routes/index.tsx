import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Clock, Wallet, Salad, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Prefs } from "@/components/Prefs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zero — assistente pessoal de tempo, dinheiro e corpo" },
      { name: "description", content: "Zero desperdício. Tempo, dinheiro, energia e corpo no máximo. Seu assistente pessoal com chat, finanças, agenda e dieta." },
      { property: "og:title", content: "Zero — assistente pessoal" },
      { property: "og:description", content: "Zero desperdício. Tempo, dinheiro, energia e corpo no máximo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  const pillars = [
    { icon: Clock, title: t("pillarTime"), d: t("pillarTimeD"), color: "text-time" },
    { icon: Wallet, title: t("pillarMoney"), d: t("pillarMoneyD"), color: "text-money" },
    { icon: Salad, title: t("pillarBody"), d: t("pillarBodyD"), color: "text-body" },
  ];
  return (
    <div className="min-h-screen grid-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Prefs />
          <Button asChild variant="ghost"><Link to="/auth">{t("signIn")}</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="mb-6 inline-block rounded-full border bg-card px-3 py-1 font-display text-xs uppercase tracking-widest text-muted-foreground">
          {t("slogan")}
        </p>
        <h1 className="max-w-4xl text-5xl font-bold leading-[1.02] md:text-7xl">{t("heroTitle")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{t("heroSub")}</p>
        <Button asChild size="lg" className="mt-10 h-12 gap-2 px-6 text-base">
          <Link to="/auth">{t("start")} <ArrowRight className="size-4" /></Link>
        </Button>
        <div className="mt-24 grid gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border bg-card p-6">
              <p.icon className={`size-7 ${p.color}`} />
              <h3 className="mt-6 text-2xl font-bold">{p.title}</h3>
              <p className="mt-2 text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
