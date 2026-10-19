import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PieChart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { deleteTimeEntries, getTimeSessions, logTimeEntry } from "@/lib/time.functions";
import { dailyTimeSummary, durationLabel, startTimeSchema, TIME_LABELS, type TimeSession } from "@/lib/time-tracking";
import { today } from "@/lib/data";

export function TimeClock() {
  const { t } = useTranslation();
  const [now, setNow] = useState<Date | null>(null);
  const [category, setCategory] = useState<TimeSession["category"]>("work");
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient(), log = useServerFn(logTimeEntry), remove = useServerFn(deleteTimeEntries);
  const { data = [] } = useQuery({ queryKey: ["time_sessions"], queryFn: () => getTimeSessions() });
  const sessions = data as TimeSession[];
  const summary = now ? dailyTimeSummary(sessions, date, now) : null;
  useEffect(() => { setNow(new Date()); }, [data]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const minutes = (Number(hours) || 0) * 60 + (Number(mins) || 0);
    if (minutes < 1) return;
    setBusy(true);
    try {
      await log({ data: { category, minutes: Math.round(minutes), dayStart: new Date(`${date}T00:00:00`).toISOString() } });
      setHours(""); setMins("");
      await qc.invalidateQueries({ queryKey: ["time_sessions"] });
    } catch (err) { toast.error(String(err).includes("DAY_FULL") ? t("clock.dayFull") : t("clock.error")); }
    finally { setBusy(false); }
  }

  async function clear(cat: TimeSession["category"]) {
    const start = new Date(`${date}T00:00:00`).getTime(), end = start + 86_400_000;
    const ids = sessions.filter(s => s.category === cat && Date.parse(s.started_at) >= start && Date.parse(s.started_at) < end).map(s => s.id);
    if (!ids.length) return;
    try { await remove({ data: { ids } }); await qc.invalidateQueries({ queryKey: ["time_sessions"] }); } catch { toast.error(t("clock.error")); }
  }

  return <section className="mb-8 border-y py-6">
    <h2 className="flex items-center gap-2 text-xl font-bold"><PieChart className="size-5 text-time" />{t("clock.title")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t("clock.intro")}</p>
    <form onSubmit={add} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_auto]">
      <select aria-label={t("clock.category")} className="col-span-2 h-10 min-w-0 rounded-md border bg-background px-3 text-sm sm:col-span-1" value={category} onChange={e => setCategory(startTimeSchema.parse({ category: e.target.value }).category)}>{Object.keys(TIME_LABELS).map(key => <option key={key} value={key}>{t(`clock.categories.${key}`)}</option>)}</select>
      <Input aria-label={t("clock.hours")} placeholder={t("clock.hours")} type="number" min={0} max={24} inputMode="numeric" value={hours} onChange={e => setHours(e.target.value)} />
      <Input aria-label={t("clock.minutes")} placeholder={t("clock.minutes")} type="number" min={0} max={59} inputMode="numeric" value={mins} onChange={e => setMins(e.target.value)} />
      <Button className="col-span-2 sm:col-span-1" disabled={busy}><Plus className="size-4" />{t("clock.add")}</Button>
    </form>
    <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t("clock.summary")}</h3><Input aria-label={t("clock.summaryDate")} className="w-auto" type="date" max={today()} value={date} onChange={e => setDate(e.target.value || today())} /></div>
    {summary && summary.total > 0 ? <div className="space-y-3">
      {summary.entries.filter(x => x.seconds > 0).sort((a, b) => b.seconds - a.seconds).map(x => <div key={x.category}>
        <div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{t(`clock.categories.${x.category}`)}</span><span className="flex items-center gap-1 text-muted-foreground"><span className="font-semibold text-foreground">{x.percent.toFixed(0)}%</span> · {durationLabel(x.seconds)}<Button type="button" variant="ghost" size="icon-sm" aria-label={t("clock.remove")} onClick={() => clear(x.category)}><Trash2 className="size-3.5" /></Button></span></div>
        <Progress value={x.percent} />
      </div>)}
      <p className="text-xs text-muted-foreground">{t("clock.totalNote", { duration: durationLabel(summary.total), percent: (100 - summary.untrackedPercent).toFixed(0) })}</p>
    </div> : <p className="text-sm text-muted-foreground">{t("clock.empty")}</p>}
  </section>;
}
