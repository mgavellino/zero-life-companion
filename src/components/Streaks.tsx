import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { Card } from "@/components/Page";
import { useRows, today } from "@/lib/data";
import { streak } from "@/lib/money-import";

/** Consecutive days with records per area; renders only once something was logged. */
export function Streaks() {
  const { t } = useTranslation();
  const { data: tx = [] } = useRows<{ occurred_on: string }>("transactions", { order: "occurred_on" });
  const { data: meals = [] } = useRows<{ eaten_on: string }>("meals");
  const { data: time = [] } = useRows<{ started_at: string }>("time_sessions", { order: "started_at" });
  const d = today();
  const items = [
    { label: t("fx.streakMoney"), n: streak(tx.map((x) => x.occurred_on), d), tone: "text-money" },
    { label: t("fx.streakDiet"), n: streak(meals.map((x) => x.eaten_on), d), tone: "text-body" },
    { label: t("fx.streakTime"), n: streak(time.map((x) => x.started_at.slice(0, 10)), d), tone: "text-time" },
  ];
  if (!items.some((i) => i.n > 0)) return null;
  return (
    <Card className="mt-6">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Flame className="size-5 text-signal" /> {t("fx.streakTitle")}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl border p-3">
            <p className={`text-xs uppercase tracking-wider ${i.tone}`}>{i.label}</p>
            <p className="font-display text-xl font-bold">{t("fx.streakDays", { count: i.n })}</p>
            <p className="text-xs text-muted-foreground">{i.n >= 30 ? t("fx.badge30") : i.n >= 7 ? t("fx.badge7") : "\u00a0"}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
