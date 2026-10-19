import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logMealAuto } from "@/lib/meals.functions";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Page, Card, Stat } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRows, useTableMutations, today } from "@/lib/data";
import { EnergyBalance } from "@/components/EnergyBalance";

export const Route = createFileRoute("/_authenticated/dieta")({
  head: () => ({ meta: [{ title: "Dieta — Zero" }, { name: "description", content: "Refeições, macros e gasto energético estimado." }, { property: "og:title", content: "Dieta — Zero" }, { property: "og:description", content: "Consumo e gasto energético diário." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: DietPage,
});

type Meal = { id: string; name: string; meal_type: string; calories: number; protein: number; carbs: number; fat: number; eaten_on: string };

function DietPage() {
  const { t } = useTranslation();
  const { data = [] } = useRows<Meal>("meals");
  const m = useTableMutations("meals");
  const qc = useQueryClient();
  const auto = useServerFn(logMealAuto);
  const [f, setF] = useState({ text: "", meal_type: "almoco" });
  const [busy, setBusy] = useState(false);
  const td = data.filter((x) => x.eaten_on === today());
  const sum = (k: keyof Meal) => td.reduce((a, x) => a + Number(x[k]), 0);
  const types: Record<string, string> = { cafe: t("breakfast"), almoco: t("lunch"), lanche: t("snack"), jantar: t("dinner") };

  return (
    <Page kicker={t("nav.diet")} title={t("meals")}>
      {td.length > 0 && <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label={t("calories")} value={`${sum("calories")}`} tone="text-body" />
        <Stat label={t("protein")} value={`${sum("protein")}g`} />
        <Stat label={t("carbs")} value={`${sum("carbs")}g`} />
        <Stat label={t("fat")} value={`${sum("fat")}g`} />
      </div>}
      <EnergyBalance intake={sum("calories")} hasIntake={td.length > 0} />
      <Card className="mb-6">
        <form
          className="grid gap-2 md:grid-cols-[1fr_160px_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!f.text.trim()) return;
            setBusy(true);
            try {
              await auto({ data: f });
              setF({ ...f, text: "" });
              qc.invalidateQueries({ queryKey: ["meals"] });
            } catch {
              toast.error("Não foi possível registrar a refeição. Confira sua autorização de saúde e tente novamente.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input placeholder={t("mealInput")} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={f.meal_type} onChange={(e) => setF({ ...f, meal_type: e.target.value })}>
            {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button type="submit" disabled={busy}>{busy ? t("calculating") : t("add")}</Button>
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
