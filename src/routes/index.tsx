import i18n from "@/lib/i18n";
import { PromoBanner } from "@/components/PromoBanner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Download, Monitor, Apple, Smartphone, Clock, Wallet, Salad, ArrowRight, Mic, Sparkles, Bell, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Prefs } from "@/components/Prefs";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LegalLinks } from "@/components/LegalLinks";
import ogCover from "@/assets/og-cover.png.asset.json";
import winExe from "@/assets/downloads/ZeroSetup.exe.asset.json";
import macArm from "@/assets/downloads/Zero-mac-arm64.dmg.asset.json";
import macIntel from "@/assets/downloads/Zero-mac-x64.dmg.asset.json";
import { InstallZero } from "@/components/InstallZero";

const OG_IMAGE = `https://assistentezero.lovable.app${ogCover.url}`;

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: i18n.t("landing.title") },
      { name: "description", content: i18n.t("landing.description") },
      { name: "google-site-verification", content: "ZSm6svarrrXx5BmugLO4J4ONWCpii8nQXA7USUCsxoE" },
      { property: "og:title", content: i18n.t("landing.socialTitle") },
      { property: "og:description", content: i18n.t("landing.socialDescription") },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
const DEMO = [
  { who: "you", text: t("landing.demo1") },
  { who: "zero", text: t("landing.demo2") },
  { who: "you", text: t("landing.demo3") },
  { who: "zero", text: t("landing.demo4") },
];

const FAQ: [string, string][] = [
  [t("landing.q1"), t("landing.a1")],
  [t("landing.q2"), t("landing.a2")],
  [t("landing.q3"), t("landing.a3")],
  [t("landing.q4"), t("landing.a4")],
];

  const pillars = [
    { icon: Clock, title: t("pillarTime"), d: t("pillarTimeD"), tone: "text-time", k: "01" },
    { icon: Wallet, title: t("pillarMoney"), d: t("pillarMoneyD"), tone: "text-money", k: "02" },
    { icon: Salad, title: t("pillarBody"), d: t("pillarBodyD"), tone: "text-body", k: "03" },
  ];
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-transparent bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#como-funciona" className="hover:text-foreground">{t("landing.how")}</a>
            <Link to="/planos" className="hover:text-foreground">{t("landing.plans")}</Link>
            <a href="#faq" className="hover:text-foreground">{t("landing.faq")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <Prefs />
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">{t("signIn")}</Link></Button>
            <Button asChild className="rounded-full"><Link to="/auth">{t("landing.trial")}</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 zero-aura" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-16 md:grid-cols-[1.15fr_1fr] md:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-signal" /> {t("slogan")}
            </p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] md:text-7xl">
              {t("landing.speak")} <span className="text-gradient-signal">{t("landing.solve")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              {t("landing.hero")}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-12 gap-2 rounded-full px-7 text-base">
                <Link to="/auth">{t("landing.start")} <ArrowRight className="size-4" /></Link>
              </Button>
              <Link to="/planos" className="text-sm text-muted-foreground underline-offset-4 hover:underline">{t("landing.from")}</Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t("landing.cancel")}</p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="space-y-3 rounded-3xl border bg-card/70 p-4 shadow-sm">
              {DEMO.map((m, i) => (
                <div key={i} className={m.who === "you" ? "ml-10 rounded-2xl rounded-br-sm bg-ink px-4 py-3 text-sm text-background dark:bg-secondary dark:text-foreground" : "mr-6 flex gap-2 rounded-2xl rounded-bl-sm border bg-background px-4 py-3 text-sm"}>
                  {m.who === "zero" && <Check className="mt-0.5 size-4 shrink-0 text-signal" />}
                  <span>{m.text}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">{t("landing.demo1")}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-signal text-signal-foreground"><Mic className="size-4" /></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <PromoBanner />
      <section className="border-y bg-card/50">
        <div className="mx-auto grid max-w-6xl md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.k} className="border-b p-8 md:border-b-0 md:border-r md:last:border-r-0">
              <div className="flex items-center justify-between">
                <p.icon className={`size-6 ${p.tone}`} />
                <span className="font-display text-xs text-muted-foreground">{p.k}</span>
              </div>
              <h3 className="mt-8 text-2xl font-semibold">{p.title}</h3>
              <p className="mt-2 text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("landing.how")}</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold md:text-5xl">{t("landing.seconds")}</h2>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            { icon: Mic, t: t("landing.open"), d: t("landing.openD") },
            { icon: Sparkles, t: t("landing.organize"), d: t("landing.organizeD") },
            { icon: Bell, t: t("landing.remind"), d: t("landing.remindD") },
          ].map((s, i) => (
            <div key={s.t} className="rounded-3xl border bg-card p-7">
              <span className="grid size-10 place-items-center rounded-full bg-signal text-signal-foreground"><s.icon className="size-4" /></span>
              <p className="mt-6 font-display text-xs text-muted-foreground">{t("landing.step", { value: i + 1 })}</p>
              <h3 className="mt-1 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-6">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-ink p-10 text-background md:p-16 dark:bg-card dark:text-foreground">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-4xl font-semibold md:text-5xl">{t("landing.cost")}</h2>
              <p className="mt-4 opacity-70">{t("landing.costD")}</p>
              <Button asChild size="lg" className="mt-8 h-12 rounded-full bg-signal px-7 text-signal-foreground hover:bg-signal/90">
                <Link to="/planos">{t("chat2.plans")}</Link>
              </Button>
            </div>
            <ul className="space-y-3">
              {([[t("landing.essential"), "R$ 9,90"], [t("landing.pro"), "R$ 21,90"], ["Max", "R$ 37,90"]] as [string, string][]).map(([n, p]) => (
                <li key={n} className="flex items-center justify-between border-b border-current/15 pb-3">
                  <span className="flex items-center gap-2"><Check className="size-4 text-signal" /> {n}</span>
                  <span className="font-display">{p}<span className="text-xs opacity-60">{t("landing.month")}</span></span>
                </li>
              ))}
              <li className="pt-1 text-xs opacity-60">{t("landing.discount")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="baixar" className="mx-auto max-w-6xl px-6 pt-24">
        <h2 className="text-center text-4xl font-semibold">{t("landing.dlTitle")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">{t("landing.dlSub")}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6"><Monitor className="size-6" /><p className="mt-3 font-semibold">Windows</p>
            <Button asChild className="mt-4 w-full"><a href={winExe.url} download="ZeroSetup.exe"><Download className="size-4" />{t("landing.dlExe")}</a></Button></div>
          <div className="rounded-2xl border bg-card p-6"><Apple className="size-6" /><p className="mt-3 font-semibold">Mac</p>
            <div className="mt-4 grid gap-2">
              <Button asChild className="w-full"><a href={macArm.url} download="Zero-mac-arm64.dmg"><Download className="size-4" />{t("landing.dlMacArm")}</a></Button>
              <Button asChild variant="outline" className="w-full"><a href={macIntel.url} download="Zero-mac-x64.dmg"><Download className="size-4" />{t("landing.dlMacIntel")}</a></Button>
            </div></div>
          <div className="rounded-2xl border bg-card p-6"><Smartphone className="size-6" /><p className="mt-3 font-semibold">Android · iPhone</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.dlMobile")}</p><div className="mt-3"><InstallZero /></div></div>
        </div>
      </section>
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-center text-4xl font-semibold">{t("landing.faq")}</h2>
        <Accordion type="single" collapsible className="mt-10">
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left text-base">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground">
          <Logo />
          <p>{t("slogan")}</p>
          <p>© {new Date().getFullYear()} Zero</p>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
