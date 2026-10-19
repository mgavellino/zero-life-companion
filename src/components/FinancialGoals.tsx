import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { today, money, useRows, useTableMutations } from "@/lib/data";
import { goalMonthlyRequired, monthlyProjection } from "@/lib/planning";
type Goal = { id: string; title: string; target_amount: number; saved_amount: number; target_date: string };
export function FinancialGoals({ income, expense, language, hasRecords }: { income: number; expense: number; language: string; hasRecords: boolean }) {
  const { t } = useTranslation();
  const { data: goals = [] } = useRows<Goal>("financial_goals");
  const m = useTableMutations("financial_goals");
  const [f, setF] = useState({ title: "", target_amount: "", saved_amount: "0", target_date: "" });
  const [deposits, setDeposits] = useState<Record<string, string>>({});
  const projection = monthlyProjection(income, expense, new Date());
  return <section className="mb-8 border-y py-6">
    {hasRecords && <><h2 className="mb-4 text-xl font-bold">{t("goals.projection")}</h2>
    <div className="grid gap-4 sm:grid-cols-3">{[[t("goals.income"), projection.income], [t("goals.expense"), projection.expense], [t("goals.balance"), projection.balance]].map(([label, value]) => <div key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{money(Number(value), language)}</p></div>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">{t("goals.projectionNote")}</p></>}
    <h2 className="mb-4 mt-8 text-xl font-bold">{t("goals.title")}</h2>
    <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_130px_130px_155px_auto]" onSubmit={async e => { e.preventDefault(); await m.insert.mutateAsync({ ...f, title: f.title.trim(), target_amount: Number(f.target_amount), saved_amount: Number(f.saved_amount) }); setF({ title: "", target_amount: "", saved_amount: "0", target_date: "" }); }}>
      <Input aria-label={t("goals.name")} placeholder={t("goals.name")} required maxLength={120} value={f.title} onChange={e => setF({ ...f, title: e.target.value })}/>
      <Input aria-label={t("goals.amountLabel")} placeholder={t("goals.target")} type="number" step="0.01" min="0.01" required value={f.target_amount} onChange={e => setF({ ...f, target_amount: e.target.value })}/>
      <Input aria-label={t("goals.savedLabel")} placeholder={t("goals.saved")} type="number" step="0.01" min="0" required value={f.saved_amount} onChange={e => setF({ ...f, saved_amount: e.target.value })}/>
      <Input aria-label={t("goals.deadline")} type="date" required min={today()} value={f.target_date} onChange={e => setF({ ...f, target_date: e.target.value })}/>
      <Button disabled={m.insert.isPending}>{t("goals.create")}</Button>
    </form>
    {!goals.length && <p className="text-sm text-muted-foreground">{t("goals.empty")}</p>}
    <div className="grid gap-4 md:grid-cols-2">{goals.map(g => {
      const required = goalMonthlyRequired(Number(g.target_amount), Number(g.saved_amount), g.target_date, today());
      const complete = Number(g.saved_amount) >= Number(g.target_amount);
      return <div key={g.id} className="min-w-0 rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2"><h3 className="flex-1 break-words font-bold">{g.title}</h3><Button variant="ghost" size="icon" aria-label={t("goals.delete", { title: g.title })} onClick={() => m.remove.mutate(g.id)}><Trash2 className="size-4"/></Button></div>
        <p className="mb-2 text-sm">{money(Number(g.saved_amount), language)} / {money(Number(g.target_amount), language)}</p><Progress value={Math.min(100, Number(g.saved_amount) / Number(g.target_amount) * 100)}/>
        <p className="my-3 text-sm text-muted-foreground">{complete ? t("goals.complete") : g.target_date < today() ? t("goals.overdue") : t("goals.monthlyRequired", { amount: money(required, language), date: g.target_date })}</p>
        {hasRecords && !complete && required > Math.max(0, projection.balance) && <p className="mb-3 text-xs text-destructive">{t("goals.insufficient")}</p>}
        <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); const value = Number(deposits[g.id]); if (!(value > 0)) return; await m.update.mutateAsync({ id: g.id, saved_amount: Number(g.saved_amount) + value }); setDeposits({ ...deposits, [g.id]: "" }); }}><Input aria-label={t("goals.depositLabel", { title: g.title })} placeholder={t("goals.deposit")} type="number" min="0.01" step="0.01" required value={deposits[g.id] ?? ""} onChange={e => setDeposits({ ...deposits, [g.id]: e.target.value })}/><Button variant="outline" disabled={m.update.isPending}>{t("goals.save")}</Button></form>
      </div>;
    })}</div>
  </section>;
}