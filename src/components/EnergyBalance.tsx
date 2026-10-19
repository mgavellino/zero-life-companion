import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { today, useRows, useTableMutations } from "@/lib/data";
import { dailyExpenditure } from "@/lib/planning";
import { logActivityAuto } from "@/lib/activity.functions";
import { Onboarding, preferencesQuery } from "./Onboarding";
type Activity = { id: string; activity: string; minutes: number; calories: number; calories_low: number | null; calories_high: number | null; personalized: boolean; occurred_on: string };
export function EnergyBalance({ intake, hasIntake }: { intake: number; hasIntake: boolean }) {
  const { t } = useTranslation();
  const { data: p } = useQuery(preferencesQuery);
  const { data: activities = [] } = useRows<Activity>("energy_activities");
  const am = useTableMutations("energy_activities"), auto = useServerFn(logActivityAuto), qc = useQueryClient();
  const [edit, setEdit] = useState(false), [text, setText] = useState(""), [date, setDate] = useState(today()), [busy, setBusy] = useState(false);
  const extra = activities.filter(x => x.occurred_on === today()).reduce((sum, x) => sum + Number(x.calories), 0);
  const hasActivity = activities.some(x => x.occurred_on === today());
  const spent = p?.health_consent_at && p.weight_kg && p.height_cm && p.age && (p.sex === "male" || p.sex === "female") ? dailyExpenditure({ weight_kg: Number(p.weight_kg), height_cm: Number(p.height_cm), age: p.age, sex: p.sex }, extra) : null;
  if (edit) return <Onboarding onDone={() => setEdit(false)} />;
  return <section className="mb-8 border-y py-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{t("energy.title")}</h2><Button variant="outline" size="sm" onClick={() => setEdit(true)}>{t("energy.measurements")}</Button></div>
    {(hasIntake || hasActivity || spent !== null) && <div className="mb-4 grid gap-4 sm:grid-cols-3">
      {hasIntake && <div><p className="text-sm text-muted-foreground">{t("energy.intake")}</p><p className="text-2xl font-bold">{t("energy.kcal", { value: intake })}</p></div>}
      {(hasActivity || spent !== null) && <div><p className="text-sm text-muted-foreground">{t(spent === null ? "energy.activitiesToday" : "energy.totalToday")}</p><p className="text-2xl font-bold">{t("energy.kcal", { value: spent === null ? extra : spent })}</p></div>}
      {hasIntake && spent !== null && <div><p className="text-sm text-muted-foreground">{t("energy.balance")}</p><p className="text-2xl font-bold">{t("energy.kcal", { value: intake - spent })}</p></div>}
    </div>}
    <p className="mb-4 text-xs text-muted-foreground">{t(spent === null ? "energy.incompleteExplanation" : "energy.completeExplanation")}</p>
    {!p?.health_consent_at && <p className="mb-4 text-sm text-muted-foreground">{t("energy.consent")}</p>}
    <form className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]" onSubmit={async e => {
      e.preventDefault(); if (!text.trim()) return; setBusy(true);
      try { const result = await auto({ data: { text, date } }); setText(""); await qc.invalidateQueries({ queryKey: ["energy_activities"] }); toast.success(t("energy.saved", { activity: result.activity, calories: Math.round(result.calories) })); }
      catch (error) { toast.error(error instanceof Error && !/[{}<>]/.test(error.message) ? error.message : t("energy.error")); }
      finally { setBusy(false); }
    }}>
      <Input aria-label={t("energy.activity")} placeholder={t("energy.placeholder")} maxLength={500} required value={text} onChange={e => setText(e.target.value)} />
      <Input aria-label={t("energy.date")} type="date" required value={date} onChange={e => setDate(e.target.value)} />
      <Button disabled={!p?.health_consent_at || busy}><Sparkles className="size-4" />{t(busy ? "energy.calculating" : "energy.log")}</Button>
    </form>
    {activities.map(x => <div key={x.id} className="flex flex-wrap items-center gap-2 border-b py-3 text-sm"><div className="min-w-0 flex-1"><p>{t("energy.activityDetails", { activity: x.activity, minutes: x.minutes, date: x.occurred_on })}</p><p className="text-xs text-muted-foreground">{t(x.personalized ? "energy.personalized" : "energy.generic")}</p></div><span>{t("energy.additional", { value: x.calories_low !== null && x.calories_high !== null ? t("energy.range", { low: Math.round(x.calories_low), high: Math.round(x.calories_high) }) : Math.round(x.calories) })}</span><Button aria-label={t("energy.delete", { activity: x.activity })} variant="ghost" size="icon" onClick={() => am.remove.mutate(x.id)}><Trash2 className="size-4" /></Button></div>)}
  </section>;
}
