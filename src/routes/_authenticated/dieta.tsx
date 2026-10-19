import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Page, Card, Stat } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRows, useTableMutations, today } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dieta")({
  head: () => ({ meta: [{ title: "Dieta — Zero" }, { name: "description", content: "Refeições e macros do dia." }, { property: "og:title", content: "Dieta — Zero" }, { property: "og:description", content: "Refeições e macros do dia." }] }),
  component: DietPage,
});

type Meal = { id: string; name: string; meal_type: string; calories: number; protein: number; carbs: number; fat: number; eaten_on: string };

function DietPage() {
  const { t } = useTranslation();
  const { data = [] } = useRows<Meal>("meals");
  const m = useTableMutations("meals");
  const empty = { name: "", meal_type: "almoco", calories: "", protein: "", carbs: "", fat: "" };
  const [f, setF] = useState(empty);
  const td = data.filter((x) => x.eaten_on === today());
  const sum = (k: keyof Meal) => td.reduce((a, x) => a + Number(x[k]), 0);
  const types: Record<string, string> = { cafe: t("breakfast"), almoco: t("lunch"), lanche: t("snack"), jantar: t("dinner") };

  return (
    <Page kicker={t("nav.diet")} title={t("meals")}>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label={t("calories")} value={`${sum("calories")}`} tone="text-body" />
        <Stat label={t("protein")} value={`${sum("protein")}g`} />
        <Stat label={t("carbs")} value={`${sum("carbs")}g`} />
        <Stat label={t("fat")} value={`${sum("fat")}g`} />
      </div>
      <Card className="mb-6">
        <form
          className="grid gap-2 md:grid-cols-[1fr_140px_90px_90px_90px_90px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.name) return;
            m.insert.mutate({ name: f.name, meal_type: f.meal_type, calories: Number(f.calories || 0), protein: Number(f.protein || 0), carbs: Number(f.carbs || 0), fat: Number(f.fat || 0) });
            setF(empty);
          }}
        >
          <Input placeholder={t("meal")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={f.meal_type} onChange={(e) => setF({ ...f, meal_type: e.target.value })}>
            {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
            <Input key={k} type="number" placeholder={t(k)} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          ))}
          <Button type="submit">{t("add")}</Button>
        </form>
      </Card>
      <div className="space-y-2">
        {data.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
        {data.map((x) => (
          <div key={x.id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <span className="w-20 text-xs text-muted-foreground">{x.eaten_on}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs">{types[x.meal_type] ?? x.meal_type}</span>
            <span className="flex-1 font-medium">{x.name}</span>
            <span className="text-xs text-muted-foreground">{x.calories} kcal · P{x.protein} C{x.carbs} G{x.fat}</span>
            <button aria-label={t("delete")} onClick={() => m.remove.mutate(x.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </Page>
  );
}
