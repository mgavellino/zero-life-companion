import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { QuickCapture } from "@/components/QuickCapture";
import { FinancialGoals } from "@/components/FinancialGoals";
import { MonthlyBills } from "@/components/MonthlyBills";
import { automaticCategory } from "@/lib/bills";
import { Page, Card, Stat } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useRows, useTableMutations, money, today } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dinheiro")({
  head: () => ({ meta: [{ title: "Dinheiro — Zero" }, { name: "description", content: "Gastos, receitas, metas e projeções financeiras." }, { property: "og:title", content: "Dinheiro — Zero" }, { property: "og:description", content: "Metas de economia e projeções do mês." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MoneyPage,
});

type Tx = { id: string; kind: string; amount: number; category: string; description: string | null; occurred_on: string };
type Budget = { id: string; category: string; monthly_limit: number };

function MoneyPage() {
  const { t, i18n } = useTranslation();
  const L = i18n.language;
  const { data: tx = [] } = useRows<Tx>("transactions", { order: "occurred_on" });
  const { data: budgets = [] } = useRows<Budget>("budgets", { order: "category", asc: true });
  const m = useTableMutations("transactions");
  const bm = useTableMutations("budgets");
  const [f, setF] = useState({ kind: "expense", amount: "", category: "", description: "", occurred_on: today() });
  const [b, setB] = useState({ category: "", monthly_limit: "" });

  const [fl, setFl] = useState({ q: "", kind: "all", cat: "all", period: "month" });
  const cats = [...new Set(tx.map((x) => x.category))].sort();
  const since = (() => {
    const d = new Date();
    if (fl.period === "7d") d.setDate(d.getDate() - 7);
    else if (fl.period === "30d") d.setDate(d.getDate() - 30);
    else if (fl.period === "month") d.setDate(1);
    else if (fl.period === "year") d.setMonth(0, 1);
    else return "";
    return d.toISOString().slice(0, 10);
  })();
  const shown = tx.filter(
    (x) =>
      (fl.kind === "all" || x.kind === fl.kind) &&
      (fl.cat === "all" || x.category === fl.cat) &&
      (!since || x.occurred_on >= since) &&
      (!fl.q || `${x.category} ${x.description ?? ""}`.toLowerCase().includes(fl.q.toLowerCase())),
  );
  const shownTotal = shown.reduce((a, x) => a + (x.kind === "income" ? 1 : -1) * Number(x.amount), 0);
  const month = today().slice(0, 7);
  const cur = tx.filter((x) => x.occurred_on.startsWith(month) && x.occurred_on <= today());
  const inc = cur.filter((x) => x.kind === "income").reduce((a, x) => a + Number(x.amount), 0);
  const exp = cur.filter((x) => x.kind === "expense").reduce((a, x) => a + Number(x.amount), 0);
  const byCat: Record<string, number> = {};
  cur.forEach((x) => x.kind === "expense" && (byCat[x.category] = (byCat[x.category] ?? 0) + Number(x.amount)));

  return (
    <Page kicker={t("nav.money")} title={t("balance")}>
      <QuickCapture className="mb-6" />
      {cur.length > 0 && <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={t("income")} value={money(inc, L)} tone="text-money" />
        <Stat label={t("expense")} value={money(exp, L)} tone="text-destructive" />
        <Stat label={t("balance")} value={money(inc - exp, L)} />
      </div>}
      <FinancialGoals income={inc} expense={exp} language={L} hasRecords={cur.length > 0} />
      <MonthlyBills language={L} />
      <Card className="mb-6">
        <form
          className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.amount) return;
            m.insert.mutate({ ...f, amount: Number(f.amount), category: automaticCategory(f.description, f.category) });
            setF({ ...f, amount: "", description: "" });
          }}
        >
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="expense">{t("expense")}</option>
            <option value="income">{t("income")}</option>
          </select>
          <Input type="number" step="0.01" placeholder={t("amount")} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <Input placeholder={`Auto: ${automaticCategory(f.description)}`} aria-label="Categoria do lançamento" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <Input placeholder={t("description")} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <Input type="date" value={f.occurred_on} onChange={(e) => setF({ ...f, occurred_on: e.target.value })} />
          <Button type="submit">{t("add")}</Button>
        </form>
      </Card>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
            <Input className="h-8 max-w-[180px]" placeholder="Buscar…" value={fl.q} onChange={(e) => setFl({ ...fl, q: e.target.value })} />
            <select className="h-8 rounded-md border bg-background px-2 text-sm" value={fl.period} onChange={(e) => setFl({ ...fl, period: e.target.value })}>
              <option value="7d">7 dias</option><option value="30d">30 dias</option><option value="month">Este mês</option><option value="year">Este ano</option><option value="all">Tudo</option>
            </select>
            <select className="h-8 rounded-md border bg-background px-2 text-sm" value={fl.kind} onChange={(e) => setFl({ ...fl, kind: e.target.value })}>
              <option value="all">Entradas e saídas</option><option value="expense">{t("expense")}</option><option value="income">{t("income")}</option>
            </select>
            <select className="h-8 rounded-md border bg-background px-2 text-sm capitalize" value={fl.cat} onChange={(e) => setFl({ ...fl, cat: e.target.value })}>
              <option value="all">Todas categorias</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="ml-auto pr-2 text-sm text-muted-foreground">{shown.length} itens · <b className="text-foreground">{money(shownTotal, L)}</b></span>
          </div>
          {shown.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
          {shown.map((x) => (
            <div key={x.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <span className="w-20 text-xs text-muted-foreground">{x.occurred_on}</span>
              <span className="min-w-0 flex-1 break-words">
                <span className="font-medium capitalize">{x.category}</span>
                {x.description && <span className="text-muted-foreground"> · {x.description}</span>}
              </span>
              <span className={`font-display font-semibold ${x.kind === "income" ? "text-money" : ""}`}>
                {x.kind === "income" ? "+" : "−"}{money(Number(x.amount), L)}
              </span>
              <button aria-label={t("delete")} onClick={() => m.remove.mutate(x.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
        <Card>
          <h3 className="mb-4 text-lg font-bold">{t("budgets")}</h3>
          <div className="space-y-4">
            {budgets.map((bg) => {
              const s = byCat[bg.category] ?? 0;
              const pct = Math.min(100, (s / Number(bg.monthly_limit)) * 100);
              return (
                <div key={bg.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize">{bg.category}</span>
                    <span className={s > Number(bg.monthly_limit) ? "text-destructive" : "text-muted-foreground"}>
                      {money(s, L)} / {money(Number(bg.monthly_limit), L)}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </div>
          <form
            className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!b.category || !b.monthly_limit) return;
              bm.insert.mutate({ category: b.category.toLowerCase(), monthly_limit: Number(b.monthly_limit) });
              setB({ category: "", monthly_limit: "" });
            }}
          >
            <Input placeholder={t("category")} value={b.category} onChange={(e) => setB({ ...b, category: e.target.value })} />
            <Input type="number" placeholder={t("limit")} value={b.monthly_limit} onChange={(e) => setB({ ...b, monthly_limit: e.target.value })} />
            <Button type="submit" size="sm">{t("add")}</Button>
          </form>
        </Card>
      </div>
    </Page>
  );
}
