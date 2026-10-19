import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { today, useRows, useTableMutations } from "@/lib/data";
import { habitsForDay } from "@/lib/planning";
type Habit = { id: string; title: string };
type Check = { id: string; habit_id: string; checked_on: string };
export function DailyHabits() {
  const { t } = useTranslation();
  const { data: habits = [] } = useRows<Habit>("habits");
  const { data: checks = [] } = useRows<Check>("habit_checks");
  const hm = useTableMutations("habits", [["habit_checks"]]);
  const cm = useTableMutations("habit_checks");
  const [title, setTitle] = useState("");
  const done = habitsForDay(checks, today());
  return <section className="mt-10 border-t pt-6">
    <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">{t("habits.title")}</h2><span className="text-sm text-muted-foreground">{t("habits.today", { done: done.length, total: habits.length })}</span></div>
    <form className="mb-4 flex gap-2" onSubmit={async e => { e.preventDefault(); if (!title.trim()) return; await hm.insert.mutateAsync({ title: title.trim() }); setTitle(""); }}>
      <Input aria-label={t("habits.new")} placeholder={t("habits.new")} value={title} onChange={e => setTitle(e.target.value)} required maxLength={120}/><Button disabled={hm.insert.isPending}>{t("habits.add")}</Button>
    </form>
    {!habits.length && <p className="text-sm text-muted-foreground">{t("habits.empty")}</p>}
    <div className="space-y-2">{habits.map(h => {
      const checked = done.find(c => c.habit_id === h.id);
      return <div key={h.id} className="flex items-center gap-3 rounded-lg border bg-card p-3"><Checkbox aria-label={t("habits.complete", { title: h.title })} checked={!!checked} disabled={cm.insert.isPending || cm.remove.isPending} onCheckedChange={value => { if (value) cm.insert.mutate({ habit_id: h.id, checked_on: today() }); else if (checked) cm.remove.mutate(checked.id); }}/><span className="flex-1 break-words">{h.title}</span><Button variant="ghost" size="icon" aria-label={t("habits.delete", { title: h.title })} onClick={() => hm.remove.mutate(h.id)}><Trash2 className="size-4"/></Button></div>;
    })}</div>
  </section>;
}