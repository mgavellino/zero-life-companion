import i18n from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Clock, Wallet, Salad, Brain, Trash2 } from "lucide-react";
import { Page, Card } from "@/components/Page";
import { useRows, useTableMutations, money, today } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: i18n.t("dash.title") }, { name: "description", content: i18n.t("dash.description") }, { property: "og:title", content: i18n.t("dash.title") }, { property: "og:description", content: i18n.t("dash.description") }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, i18n } = useTranslation();
  const { data: tasks = [] } = useRows<{ id: string; title: string; done: boolean }>("tasks");
  const { data: tx = [] } = useRows<{ kind: string; amount: number; occurred_on: string }>("transactions", { order: "occurred_on" });
  const { data: meals = [] } = useRows<{ calories: number; eaten_on: string }>("meals");
  const { data: mem = [] } = useRows<{ id: string; content: string }>("memories");
  const mm = useTableMutations("memories");
  const month = today().slice(0, 7);
  const bal = tx.filter((x) => x.occurred_on.startsWith(month)).reduce((a, x) => a + (x.kind === "income" ? 1 : -1) * Number(x.amount), 0);
  const kcal = meals.filter((x) => x.eaten_on === today()).reduce((a, x) => a + x.calories, 0);

  const tiles = [
    { to: "/tempo", icon: Clock, label: t("nav.time"), value: t("dash.pending", { count: tasks.filter((x) => !x.done).length }), tone: "text-time" },
    { to: "/dinheiro", icon: Wallet, label: t("nav.money"), value: money(bal, i18n.language), tone: "text-money" },
    { to: "/dieta", icon: Salad, label: t("nav.diet"), value: t("dash.calories", { value: kcal }), tone: "text-body" },
  ] as const;

  return (
    <Page kicker={t("slogan")} title={t("overview")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((x) => (
          <Link key={x.to} to={x.to} className="rounded-2xl border bg-card p-5 hover:border-ring">
            <x.icon className={`size-6 ${x.tone}`} />
            <p className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">{x.label}</p>
            <p className="font-display text-2xl font-bold">{x.value}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Brain className="size-5" /> {t("memory")}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{t("sharedMemory")}</p>
        {mem.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        <ul className="space-y-1.5">
          {mem.map((m) => (
            <li key={m.id} className="group flex items-start gap-2 text-sm">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ring" />
              <span className="flex-1">{m.content}</span>
              <button aria-label={t("delete")} onClick={() => mm.remove.mutate(m.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="size-3.5 text-muted-foreground" /></button>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}
