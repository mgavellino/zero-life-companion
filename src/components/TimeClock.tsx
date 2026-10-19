import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, Square, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { getTimeSessions, startTimeSession, stopTimeSession } from "@/lib/time.functions";
import { dailyTimeSummary, durationLabel, startTimeSchema, TIME_LABELS, type TimeSession } from "@/lib/time-tracking";
import { today } from "@/lib/data";
import { useUnits } from "@/lib/units";

export function TimeClock() {
  const { t, i18n } = useTranslation();
  const units = useUnits();
  const [now, setNow] = useState<Date | null>(null);
  const [category, setCategory] = useState<TimeSession["category"]>("work");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient(), start = useServerFn(startTimeSession), stop = useServerFn(stopTimeSession);
  const { data = [] } = useQuery({ queryKey: ["time_sessions"], queryFn: () => getTimeSessions(), refetchOnWindowFocus: true });
  const sessions = data as TimeSession[];
  const active = sessions.find(x => !x.ended_at);
  const summary = now ? dailyTimeSummary(sessions, date, now) : null;
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  async function toggle() {
    setBusy(true);
    try {
      if (active) await stop({ data: { id: active.id } });
      else await start({ data: startTimeSchema.parse({ category }) });
      await qc.invalidateQueries({ queryKey: ["time_sessions"] });
    } catch { toast.error(t("clock.error")); }
    finally { setBusy(false); }
  }
  return <section className="mb-8 border-y py-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="flex items-center gap-2 text-xl font-bold"><Clock3 className="size-5 text-time" />{t("clock.title")}</h2><p className="mt-2 font-mono text-3xl tabular-nums" aria-label={t("clock.currentTime")}>{now?.toLocaleTimeString(i18n.language) ?? "—"}</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label={t("clock.category")} className="h-10 rounded-md border bg-background px-3 text-sm" value={active?.category ?? category} disabled={!!active} onChange={e => setCategory(startTimeSchema.parse({ category: e.target.value }).category)}>{Object.entries(TIME_LABELS).map(([key]) => <option key={key} value={key}>{t(`clock.categories.${key}`)}</option>)}</select>
        <span className="w-24 font-mono text-lg tabular-nums" aria-label={t("clock.elapsed")}>{active && now ? durationLabel((now.getTime() - Date.parse(active.started_at)) / 1000) : "00:00:00"}</span>
        <Button disabled={busy} onClick={toggle}>{active ? <Square className="size-4" /> : <Play className="size-4" />}{active ? t("clock.stop") : t("clock.start")}</Button>
      </div>
    </div>
    <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t(date === today() ? "clock.summaryOngoing" : "clock.summary")}</h3><Input aria-label={t("clock.summaryDate")} className="w-auto" type="date" max={today()} value={date} onChange={e => setDate(e.target.value || today())} /></div>
    {summary && summary.total > 0 ? <div className="space-y-3">{summary.entries.filter(x => x.seconds > 0).map(x => <div key={x.category}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{t(`clock.categories.${x.category}`)}</span><span>{t("clock.dayShare", { duration: durationLabel(x.seconds), percent: x.percent.toFixed(1) })}</span></div><Progress value={x.percent} /></div>)}<p className="text-xs text-muted-foreground">{t("clock.untracked", { percent: summary.untrackedPercent.toFixed(1) })}</p></div> : <p className="text-sm text-muted-foreground">{t("clock.empty")}</p>}
  </section>;
}