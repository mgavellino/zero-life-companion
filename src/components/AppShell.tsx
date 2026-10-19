import { Bot } from "lucide-react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessageSquare, LayoutGrid, Clock, Wallet, Salad, LogOut, Sparkles, BarChart3, Shield, Menu, Settings } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { Prefs } from "./Prefs";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";
import { useSubscription } from "@/hooks/use-subscription";
import { OnboardingGate } from "./Onboarding";
import { ShellClock } from "./ShellClock";
import { InstallZero } from "./InstallZero";

export function AppShell() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { plan, sub, trial } = useSubscription();
  const PLAN_LABEL = { free: t("shell.freePlan"), essencial: "Essencial", pro: "Pro", max: "Max" } as const;
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return !!data;
    },
  });
  const items = [
    { to: "/chat", icon: MessageSquare, label: t("nav.chat") },
    { to: "/dashboard", icon: LayoutGrid, label: t("nav.dashboard") },
    { to: "/tempo", icon: Clock, label: t("nav.time") },
    { to: "/dinheiro", icon: Wallet, label: t("nav.money") },
    { to: "/dieta", icon: Salad, label: t("nav.diet") },
    { to: "/relatorios", icon: BarChart3, label: t("shell.reports") },
    { to: "/conta", icon: Sparkles, label: t("shell.plan") },
    { to: "/assistentes", icon: Bot, label: t("agents.nav") },
    { to: "/configuracoes", icon: Settings, label: t("shell.settings") },
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <OnboardingGate>
    <div className="app-shell flex h-dvh min-w-0 flex-col">
      <PaymentTestModeBanner />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b bg-sidebar px-3 py-2 lg:hidden">
        <div className="flex min-w-0 items-center gap-1"><Button variant="ghost" size="icon" aria-label={t("shell.openMenu")} onClick={() => setMenuOpen(true)}><Menu className="size-5" /></Button><Link to="/chat"><Logo /></Link></div>
        <div className="flex shrink-0 items-center"><ShellClock /><NotificationBell /></div>
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(88vw,360px)] overflow-y-auto">
          <SheetTitle>Zero</SheetTitle><SheetDescription>{t("shell.tagline")}</SheetDescription>
          <nav className="mt-6 grid gap-2">{items.map(i => <Link key={i.to} to={i.to} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground" activeProps={{className:"bg-accent text-accent-foreground"}}><i.icon className="size-5 shrink-0" />{i.label}</Link>)}{isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center gap-3 px-3"><Shield className="size-5" />Admin</Link>}</nav>
          <div className="mt-4"><InstallZero /></div>
          <div className="mt-6 flex items-center justify-between border-t pt-4"><Prefs /><Button variant="ghost" onClick={signOut}><LogOut className="size-4" />{t("signOut")}</Button></div>
        </SheetContent>
      </Sheet>
      <div className="flex min-h-0 min-w-0 flex-1">
        <aside className="hidden w-60 shrink-0 flex-col items-stretch border-r bg-sidebar p-4 lg:flex">
          <Link to="/chat" className="md:mb-8"><Logo /></Link>
          <ShellClock />
          <nav className="flex flex-col gap-1">
            {items.map((i) => (
              <Link
                key={i.to}
                to={i.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                activeProps={{ className: "bg-sidebar-accent !text-foreground" }}
              >
                <i.icon className="size-4" />
                <span className="hidden md:inline">{i.label}</span>
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" activeProps={{ className: "bg-sidebar-accent !text-foreground" }}>
                <Shield className="size-4" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
          </nav>
          <div className="md:mt-auto">
            <InstallZero />
            {plan === "free" ? (
              <Link to="/planos" className="mb-3 hidden rounded-xl bg-ink p-3 text-xs text-background md:block dark:bg-card dark:text-foreground">
                <p className="font-display text-sm font-semibold">{t("shell.freeMonth")}</p>
                <p className="mt-1 opacity-70">{t("shell.promoVoice")}</p>
                <span className="mt-2 inline-block rounded-full bg-signal px-2 py-0.5 font-semibold text-signal-foreground">{t("shell.startTrial")}</span>
              </Link>
            ) : (
              <p className="mb-3 hidden px-3 text-xs text-muted-foreground md:block">
                {t("shell.plan")} <span className="font-semibold text-foreground">{PLAN_LABEL[plan]}</span>
                {trial ? t("shell.trialSuffix") : ""}
              </p>
            )}
            <div className="flex items-center gap-1 md:justify-between">
              <Prefs />
              <NotificationBell />
              <Button variant="ghost" size="icon" aria-label={t("signOut")} onClick={signOut}>
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </aside>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <nav aria-label={t("shell.mainNav")} className="grid shrink-0 grid-cols-5 border-t bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.filter(i => ["/chat", "/tempo", "/dinheiro", "/dieta"].includes(i.to)).map(i => <Link key={i.to} to={i.to} className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground" activeProps={{className:"text-primary bg-accent/40"}}><i.icon className="size-5" /><span className="max-w-full truncate">{i.label}</span></Link>)}
        <Button variant="ghost" className="h-14 flex-col gap-1 rounded-none text-[11px] text-muted-foreground" aria-label={t("shell.moreOptions")} onClick={() => setMenuOpen(true)}><Menu className="size-5" />{t("shell.more")}</Button>
      </nav>
    </div>
    </OnboardingGate>
  );
}
