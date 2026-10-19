import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Page, Card, Stat } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useRows, useTableMutations } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/tempo")({
  head: () => ({ meta: [{ title: "Tempo — Zero" }, { name: "description", content: "Tarefas, prazos e foco." }, { property: "og:title", content: "Tempo — Zero" }, { property: "og:description", content: "Tarefas, prazos e foco." }] }),
  component: TimePage,
});

type Task = { id: string; title: string; due_at: string | null; minutes: number | null; priority: string; done: boolean };
const PRI: Record<string, string> = { alta: "bg-destructive", media: "bg-time", baixa: "bg-muted-foreground" };

function TimePage() {
  const { t, i18n } = useTranslation();
  const { data = [] } = useRows<Task>("tasks", { order: "due_at", asc: true });
  const m = useTableMutations("tasks");
  const [f, setF] = useState({ title: "", due_at: "", minutes: "", priority: "media" });
  const pending = data.filter((x) => !x.done);
  const load = pending.reduce((a, x) => a + (x.minutes ?? 0), 0);

  return (
    <Page kicker={t("nav.time")} title={t("tasks")}>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={t("pending")} value={String(pending.length)} tone="text-time" />
        <Stat label={t("done")} value={String(data.length - pending.length)} />
        <Stat label={t("focusLoad")} value={`${Math.floor(load / 60)}h${String(load % 60).padStart(2, "0")}`} />
      </div>
      <Card className="mb-6">
        <form
          className="grid gap-2 md:grid-cols-[1fr_200px_110px_120px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.title) return;
            m.insert.mutate({ title: f.title, due_at: f.due_at ? new Date(f.due_at).toISOString() : null, minutes: f.minutes ? Number(f.minutes) : null, priority: f.priority });
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
        {data.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
        {data.map((x) => (
          <div key={x.id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <Checkbox checked={x.done} onCheckedChange={(v) => m.update.mutate({ id: x.id, done: !!v })} />
            <span className={`size-2 rounded-full ${PRI[x.priority] ?? PRI["media"]}`} />
            <span className={`flex-1 ${x.done ? "text-muted-foreground line-through" : ""}`}>{x.title}</span>
            {x.minutes && <span className="text-xs text-muted-foreground">{x.minutes} min</span>}
            {x.due_at && <span className="text-xs text-muted-foreground">{new Date(x.due_at).toLocaleString(i18n.language, { dateStyle: "short", timeStyle: "short" })}</span>}
            <button aria-label={t("delete")} onClick={() => m.remove.mutate(x.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </Page>
  );
}
