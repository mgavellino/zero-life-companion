import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRows, useTableMutations } from "@/lib/data";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseExercisesCsv, parseFoodsCsv } from "@/lib/csv-import";

type Food = { id: string; name: string; kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number; unit_grams: number | null };
type Exercise = { id: string; name: string; kcal_per_hour: number };

const n = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));

/** Owner's own foods and exercises; the chat and diet page use them before the built-in tables or AI. */
export function CustomEntries() {
  const { t } = useTranslation();
  const foods = useRows<Food>("custom_foods");
  const exercises = useRows<Exercise>("custom_exercises");
  const fm = useTableMutations("custom_foods");
  const em = useTableMutations("custom_exercises");
  const [f, setF] = useState({ name: "", kcal: "", p: "", c: "", g: "", unit: "" });
  const [e, setE] = useState({ name: "", kcal: "" });

  const qc = useQueryClient();
  async function importCsv(file: File | undefined, kind: "foods" | "exercises") {
    if (!file) return;
    const text = await file.text();
    const { rows, skipped } = kind === "foods" ? parseFoodsCsv(text) : parseExercisesCsv(text);
    const table = kind === "foods" ? "custom_foods" : "custom_exercises";
    if (rows.length) {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from(table).insert(rows.map((r) => ({ ...r, user_id: u.user?.id })) as never);
      if (error) { toast.error(t("customEntries.invalid")); return; }
      qc.invalidateQueries({ queryKey: [table] });
      toast.success(t("barcode.imported", { count: rows.length }));
    }
    if (skipped) toast.warning(t("barcode.skipped", { count: skipped }));
  }
  const csvButton = (kind: "foods" | "exercises") => (
    <label className="mt-2 flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed p-3 text-sm">
      <span className="flex items-center gap-2 font-medium"><Upload className="size-4" />{t("barcode.importCsv")}</span>
      <span className="text-xs text-muted-foreground">{t(kind === "foods" ? "barcode.csvFoods" : "barcode.csvExercises")}</span>
      <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(ev) => { void importCsv(ev.target.files?.[0], kind); ev.target.value = ""; }} />
    </label>
  );

  function addFood(ev: React.FormEvent) {
    ev.preventDefault();
    const kcal = n(f.kcal), p = n(f.p || "0"), c = n(f.c || "0"), g = n(f.g || "0"), unit = f.unit ? n(f.unit) : null;
    if (!f.name.trim() || !(kcal >= 0 && kcal <= 950) || [p, c, g].some((x) => !(x >= 0 && x <= 100)) || (unit !== null && !(unit > 0 && unit <= 5000))) { toast.error(t("customEntries.invalid")); return; }
    fm.insert.mutate({ name: f.name.trim().slice(0, 80), kcal_100g: kcal, protein_100g: p, carbs_100g: c, fat_100g: g, unit_grams: unit }, { onSuccess: () => { toast.success(t("customEntries.saved")); setF({ name: "", kcal: "", p: "", c: "", g: "", unit: "" }); } });
  }
  function addExercise(ev: React.FormEvent) {
    ev.preventDefault();
    const kcal = n(e.kcal);
    if (!e.name.trim() || !(kcal > 0 && kcal <= 3000)) { toast.error(t("customEntries.invalid")); return; }
    em.insert.mutate({ name: e.name.trim().slice(0, 80), kcal_per_hour: kcal }, { onSuccess: () => { toast.success(t("customEntries.saved")); setE({ name: "", kcal: "" }); } });
  }

  return (
    <Card className="mb-6">
      <h2 className="text-lg font-bold">{t("customEntries.title")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t("customEntries.body")}</p>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <section className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold">{t("customEntries.foods")}</h3>
          <form onSubmit={addFood} className="grid grid-cols-2 gap-2">
            <Input className="col-span-2" aria-label={t("customEntries.name")} placeholder={t("customEntries.name")} value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} />
            <Input inputMode="decimal" aria-label={t("customEntries.kcal100")} placeholder={t("customEntries.kcal100")} value={f.kcal} onChange={(x) => setF({ ...f, kcal: x.target.value })} />
            <Input inputMode="decimal" aria-label={t("customEntries.protein")} placeholder={t("customEntries.protein")} value={f.p} onChange={(x) => setF({ ...f, p: x.target.value })} />
            <Input inputMode="decimal" aria-label={t("customEntries.carbs")} placeholder={t("customEntries.carbs")} value={f.c} onChange={(x) => setF({ ...f, c: x.target.value })} />
            <Input inputMode="decimal" aria-label={t("customEntries.fat")} placeholder={t("customEntries.fat")} value={f.g} onChange={(x) => setF({ ...f, g: x.target.value })} />
            <Input className="col-span-2" inputMode="decimal" aria-label={t("customEntries.unit")} placeholder={t("customEntries.unit")} value={f.unit} onChange={(x) => setF({ ...f, unit: x.target.value })} />
            <Button className="col-span-2" type="submit" disabled={fm.insert.isPending}>{t("customEntries.add")}</Button>
          </form>
          {csvButton("foods")}
          <ul className="mt-3 space-y-1">
            {(foods.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">{t("customEntries.empty")}</li>}
            {(foods.data ?? []).map((x) => (
              <li key={x.id} className="flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{x.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{Number(x.kcal_100g)} kcal · P {Number(x.protein_100g)} · C {Number(x.carbs_100g)} · G {Number(x.fat_100g)}</span>
                <button aria-label={t("delete")} onClick={() => fm.remove.mutate(x.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        </section>
        <section className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold">{t("customEntries.exercises")}</h3>
          <form onSubmit={addExercise} className="grid grid-cols-2 gap-2">
            <Input className="col-span-2" aria-label={t("customEntries.name")} placeholder={t("customEntries.name")} value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} />
            <Input className="col-span-2" inputMode="decimal" aria-label={t("customEntries.kcalHour")} placeholder={t("customEntries.kcalHour")} value={e.kcal} onChange={(x) => setE({ ...e, kcal: x.target.value })} />
            <Button className="col-span-2" type="submit" disabled={em.insert.isPending}>{t("customEntries.add")}</Button>
          </form>
          {csvButton("exercises")}
          <ul className="mt-3 space-y-1">
            {(exercises.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">{t("customEntries.empty")}</li>}
            {(exercises.data ?? []).map((x) => (
              <li key={x.id} className="flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{x.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{Number(x.kcal_per_hour)} kcal/h</span>
                <button aria-label={t("delete")} onClick={() => em.remove.mutate(x.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Card>
  );
}
