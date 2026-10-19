import i18n from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, CalendarPlus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarConnection } from "@/components/CalendarConnection";
import { sendTaskToCalendar } from "@/lib/calendar.functions";
import { Page, Card, Stat } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useRows, useTableMutations } from "@/lib/data";
import { DailyHabits } from "@/components/DailyHabits";
import { TimeClock } from "@/components/TimeClock";

export const Route = createFileRoute("/_authenticated/tempo")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: i18n.t("time2.title") }, { name: "description", content: i18n.t("time2.description") }, { property: "og:title", content: i18n.t("time2.title") }, { property: "og:description", content: i18n.t("time2.socialDescription") }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: TimePage,
});

type Task = { id: string; title: string; due_at: string | null; minutes: number | null; priority: string; done: boolean };
const PRI: Record<string, string> = { alta: "bg-destructive", media: "bg-time", baixa: "bg-muted-foreground" };

function TimePage() {
  const { t, i18n } = useTranslation();
  const { data = [] } = useRows<Task>("tasks", { order: "due_at", asc: true });
  const m = useTableMutations("tasks");
  const sendCalendar = useServerFn(sendTaskToCalendar);
  const [f, setF] = useState({ title: "", due_at: "", minutes: "", priority: "media" });
  const pending = data.filter((x) => !x.done);
  const [fl, setFl] = useState({ q: "", status: "pending", when: "all", pri: "all" });
  const shown = data.filter((x) => {
    if (fl.status === "pending" && x.done) return false;
    if (fl.status === "done" && !x.done) return false;
    if (fl.pri !== "all" && x.priority !== fl.pri) return false;
    if (fl.q && !x.title.toLowerCase().includes(fl.q.toLowerCase())) return false;
    if (fl.when !== "all") {
      if (!x.due_at) return fl.when === "nodate";
      if (fl.when === "nodate") return false;
      const d = new Date(x.due_at), now = new Date();
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + (fl.when === "today" ? 1 : 7));
      if (fl.when === "late") return d < now && !x.done;
      return d >= start && d < end;
    }
    return true;
  });
  const load = pending.reduce((a, x) => a + (x.minutes ?? 0), 0);

  return (
    <Page kicker={t("nav.time")} title={t("tasks")}>
      <TimeClock />
      <CalendarConnection />
      {data.length > 0 && <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={t("pending")} value={String(pending.length)} tone="text-time" />
        <Stat label={t("done")} value={String(data.length - pending.length)} />
        <Stat label={t("focusLoad")} value={`${Math.floor(load / 60)}h${String(load % 60).padStart(2, "0")}`} />
      </div>}
      <Card className="mb-6">
        <form
          className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_200px_110px_120px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.title) return;
            { const id = crypto.randomUUID(); const due = f.due_at ? new Date(f.due_at).toISOString() : null; m.insert.mutate({ id, title: f.title.trim(), due_at: due, minutes: f.minutes ? Number(f.minutes) : null, priority: f.priority }, { onSuccess: () => { if (due) sendCalendar({ data: { id } }).catch(() => {}); } }); }
            setF({ title: "", due_at: "", minutes: "", priority: "media" });
          }}
        >
          <Input placeholder={t("task")} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Input type="datetime-local" value={f.due_at} onChange={(e) => setF({ ...f, due_at: e.target.value })} />
          <Input type="number" placeholder={t("minutes")} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
            <option value="alta">{t("high")}</option>
            <option value="media">{t("medium")}</option>
            <option value="baixa">{t("low")}</option>
          </select>
          <Button type="submit">{t("add")}</Button>
        </form>
      </Card>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
          <Input className="h-8 max-w-[180px]" placeholder={t("shell.search")} value={fl.q} onChange={(e) => setFl({ ...fl, q: e.target.value })} />
          {([["pending", t("pending")], ["done", t("done")], ["all", t("time2.all")]] as const).map(([v, l]) => (
            <Button key={v} size="sm" variant={fl.status === v ? "default" : "ghost"} onClick={() => setFl({ ...fl, status: v })}>{l}</Button>
          ))}
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={fl.when} onChange={(e) => setFl({ ...fl, when: e.target.value })}>
            <option value="all">{t("time2.anyDate")}</option><option value="today">{t("today")}</option><option value="week">{t("time2.week")}</option><option value="late">{t("time2.late")}</option><option value="nodate">{t("time2.noDate")}</option>
          </select>
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={fl.pri} onChange={(e) => setFl({ ...fl, pri: e.target.value })}>
            <option value="all">{t("time2.priority")}</option><option value="alta">{t("high")}</option><option value="media">{t("medium")}</option><option value="baixa">{t("low")}</option>
          </select>
          <span className="ml-auto pr-2 text-sm text-muted-foreground">{t("shell.items", { count: shown.length })}</span>
        </div>
        {shown.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
        {shown.map((x) => (
          <div key={x.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <Checkbox checked={x.done} onCheckedChange={(v) => m.update.mutate({ id: x.id, done: !!v })} />
            <span className={`size-2 rounded-full ${PRI[x.priority] ?? PRI["media"]}`} />
            <span className={`min-w-0 flex-1 break-words ${x.done ? "text-muted-foreground line-through" : ""}`}>{x.title}</span>
            {x.minutes && <span className="text-xs text-muted-foreground">{x.minutes} min</span>}
            {x.due_at && <span className="text-xs text-muted-foreground">{new Date(x.due_at).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" })}</span>}
            {x.due_at && <Button variant="ghost" size="icon" aria-label={t("time2.calendar")} title={t("time2.calendar")} onClick={async()=>{try{await sendCalendar({data:{id:x.id}});toast.success(t("time2.saved"));}catch{toast.error(t("time2.error"));}}}><CalendarPlus className="size-4" /></Button>}
            <button aria-label={t("delete")} onClick={() => m.remove.mutate(x.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
      <DailyHabits />
    </Page>
  );
}
