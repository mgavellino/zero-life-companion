import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessageSquare, LayoutGrid, Clock, Wallet, Salad, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { Prefs } from "./Prefs";
import { Button } from "./ui/button";

export function AppShell() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const items = [
    { to: "/chat", icon: MessageSquare, label: t("nav.chat") },
    { to: "/dashboard", icon: LayoutGrid, label: t("nav.dashboard") },
    { to: "/tempo", icon: Clock, label: t("nav.time") },
    { to: "/dinheiro", icon: Wallet, label: t("nav.money") },
    { to: "/dieta", icon: Salad, label: t("nav.diet") },
  ] as const;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 items-center justify-between border-b bg-sidebar px-3 py-2 md:w-56 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:p-4">
        <Link to="/chat" className="md:mb-8"><Logo /></Link>
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
        </nav>
        <div className="flex items-center gap-1 md:mt-auto md:justify-between">
          <Prefs />
          <Button variant="ghost" size="icon" aria-label={t("signOut")} onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
