import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Prefs } from "@/components/Prefs";
import { PricingTable } from "@/components/PricingTable";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { LegalLinks } from "@/components/LegalLinks";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: i18n.t("pricing.metaTitle") },
      { name: "description", content: i18n.t("pricing.metaDescription") },
      { property: "og:title", content: i18n.t("pricing.ogTitle") },
      { property: "og:description", content: i18n.t("pricing.ogDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Planos,
});

function Planos() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/"><Logo /></Link>
        <div className="flex items-center gap-2">
          <Prefs />
          <Button asChild variant="ghost"><Link to="/auth">{t("pricing.login")}</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <p className="text-center font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("pricing.title")}</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-center text-4xl font-semibold md:text-6xl">{t("pricing.headline")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">{t("pricing.intro")}</p>
        <div className="mt-12"><PricingTable /></div>
      </main>
      <footer className="mx-auto max-w-6xl border-t px-6 py-8"><LegalLinks /></footer>
    </div>
  );
}
