import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Crown, Lightbulb, Loader2 } from "lucide-react";
import { Page, Card, Stat } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/hooks/use-subscription";
import { getReport, planWeek } from "@/lib/reports.functions";
import { LIMITS } from "@/lib/plans";
import { money } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/relatorios")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: i18n.t("reports.metaTitle") },
      { name: "description", content: i18n.t("reports.metaDescription") },
      { property: "og:title", content: i18n.t("reports.metaTitle") },
      { property: "og:description", content: i18n.t("reports.ogDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { t } = useTranslation();
  const { plan, loading } = useSubscription();
  const allowed = LIMITS[plan].reports;
  const fetchReport = useServerFn(getReport);
  const runPlan = useServerFn(planWeek);
  const [goal, setGoal] = useState("");
  const q = useQuery({ queryKey: ["report"], queryFn: () => fetchReport(), enabled: allowed });
  const pw = useMutation({
    mutationFn: () => runPlan({ data: { goal, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }),
    onSuccess: (r) => toast.success(t("reports.created", { value: r.created })),
    onError: (e) => toast.error((e as Error).message),
  });

  if (!loading && !allowed)
    return (
      <Page kicker={t("reports.exclusive")} title={t("reports.planningTitle")}>
        <Card className="mx-auto max-w-lg text-center">
          <Crown className="mx-auto size-10 text-signal" />
          <p className="mt-4 font-display text-xl font-semibold">{t("reports.upsellTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("reports.upsellDescription")}</p>
          <Button asChild className="mt-6"><Link to="/conta">{t("reports.unlock")}</Link></Button>
        </Card>
      </Page>
    );

  const d = q.data;
  const maxExp = Math.max(1, ...(d?.months ?? []).map((m) => Math.max(m.expense, m.income)));
  return (
    <Page kicker="Max" title={t("reports.title")}>
      <Card className="mb-6">
        <div className="flex items-center gap-2 font-display font-semibold"><CalendarRange className="size-5" /> {t("reports.planWeek")}</div>
        <p className="mt-1 text-sm text-muted-foreground">{t("reports.weekDescription")}</p>
        <div className="mt-3 flex gap-2">
          <Input placeholder={t("reports.goal")} value={goal} onChange={(e) => setGoal(e.target.value)} />
          <Button onClick={() => pw.mutate()} disabled={pw.isPending}>{pw.isPending ? <Loader2 className="size-4 animate-spin" /> : t("reports.plan")}</Button>
        </div>
      </Card>
      {q.isLoading || !d ? (
        <Card className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t("reports.generating")}</Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <Stat label={t("reports.tasks")} value={`${d.tasks.done}/${d.tasks.total}`} />
            <Stat label={t("reports.hours")} value={`${Math.round(d.tasks.minutes / 60)}h`} />
            <Stat label={t("reports.kcal")} value={String(d.diet.avgKcal)} />
            <Stat label={t("reports.protein")} value={`${d.diet.avgProt}g`} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <p className="mb-4 font-display font-semibold">{t("reports.incomeExpenses")}</p>
              <div className="flex h-48 items-end gap-6">
                {d.months.map((m) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-40 w-full items-end gap-1">
                      <div className="flex-1 rounded-t bg-money" style={{ height: `${(m.income / maxExp) * 100}%` }} title={money(m.income)} />
                      <div className="flex-1 rounded-t bg-destructive" style={{ height: `${(m.expense / maxExp) * 100}%` }} title={money(m.expense)} />
                    </div>
                    <span className="text-xs text-muted-foreground">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
                  </div>
                ))}
                {!d.months.length && <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>}
              </div>
            </Card>
            <Card>
              <p className="mb-4 font-display font-semibold">{t("reports.spending")}</p>
              <ul className="space-y-2 text-sm">
                {d.categories.slice(0, 8).map((c) => (
                  <li key={c.category}>
                    <div className="flex justify-between"><span className="capitalize">{c.category}</span><span>{money(c.amount)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.amount / (d.categories[0]?.amount || 1)) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          {d.insights.length > 0 && (
            <Card className="mt-6">
              <p className="mb-3 flex items-center gap-2 font-display font-semibold"><Lightbulb className="size-5 text-signal" /> {t("reports.insights")}</p>
              <ul className="space-y-2 text-sm">{d.insights.map((i) => <li key={i}>• {i}</li>)}</ul>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
