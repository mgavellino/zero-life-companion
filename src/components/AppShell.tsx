import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessageSquare, LayoutGrid, Clock, Wallet, Salad, LogOut, Sparkles, BarChart3, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { Prefs } from "./Prefs";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";
import { useSubscription } from "@/hooks/use-subscription";
import { OnboardingGate } from "./Onboarding";
import { ShellClock } from "./ShellClock";

const PLAN_LABEL = { free: "Grátis", essencial: "Essencial", pro: "Pro", max: "Max" } as const;

export function AppShell() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { plan, sub } = useSubscription();
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
    { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
    { to: "/conta", icon: Sparkles, label: "Plano" },
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-screen flex-col">
      <PaymentTestModeBanner />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex shrink-0 items-center justify-between border-b bg-sidebar px-3 py-2 md:w-60 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:p-4">
          <Link to="/chat" className="md:mb-8"><Logo /></Link>
          <ShellClock />
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
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
            {plan === "free" ? (
              <Link to="/planos" className="mb-3 hidden rounded-xl bg-ink p-3 text-xs text-background md:block dark:bg-card dark:text-foreground">
                <p className="font-display text-sm font-semibold">1 mês grátis</p>
                <p className="mt-1 opacity-70">Voz premium e IA ilimitada.</p>
                <span className="mt-2 inline-block rounded-full bg-signal px-2 py-0.5 font-semibold text-signal-foreground">Começar teste →</span>
              </Link>
            ) : (
              <p className="mb-3 hidden px-3 text-xs text-muted-foreground md:block">
                Plano <span className="font-semibold text-foreground">{PLAN_LABEL[plan]}</span>
                {sub?.status === "trialing" ? " · teste" : ""}
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
        <main className="min-h-0 flex-1 overflow-y-auto">
          <OnboardingGate><Outlet /></OnboardingGate>
        </main>
      </div>
    </div>
  );
}
