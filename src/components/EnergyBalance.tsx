import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { today, useRows, useTableMutations } from "@/lib/data";
import { dailyExpenditure } from "@/lib/planning";
import { logActivityAuto } from "@/lib/activity.functions";
import { Onboarding, preferencesQuery } from "./Onboarding";
type Activity = { id: string; activity: string; minutes: number; calories: number; calories_low: number | null; calories_high: number | null; personalized: boolean; occurred_on: string };
export function EnergyBalance({ intake }: { intake: number }) {
  const { data: p } = useQuery(preferencesQuery);
  const { data: activities = [] } = useRows<Activity>("energy_activities");
  const am = useTableMutations("energy_activities"), auto = useServerFn(logActivityAuto), qc = useQueryClient();
  const [edit, setEdit] = useState(false), [text, setText] = useState(""), [date, setDate] = useState(today()), [busy, setBusy] = useState(false);
  const extra = activities.filter(x => x.occurred_on === today()).reduce((sum, x) => sum + Number(x.calories), 0);
  const spent = p?.health_consent_at && p.weight_kg && p.height_cm && p.age && (p.sex === "male" || p.sex === "female") ? dailyExpenditure({ weight_kg: Number(p.weight_kg), height_cm: Number(p.height_cm), age: p.age, sex: p.sex }, extra) : null;
  if (edit) return <Onboarding onDone={() => setEdit(false)} />;
  return <section className="mb-8 border-y py-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Balanço energético</h2><Button variant="outline" size="sm" onClick={() => setEdit(true)}>Medidas e autorização</Button></div>
    <div className="mb-4 grid gap-4 sm:grid-cols-3">
      <div><p className="text-sm text-muted-foreground">Consumo hoje</p><p className="text-2xl font-bold">{intake} kcal</p></div>
      <div><p className="text-sm text-muted-foreground">{spent === null ? "Atividades hoje · estimativa" : "Gasto total hoje · estimativa"}</p><p className="text-2xl font-bold">{spent === null ? extra : spent} kcal</p></div>
      <div><p className="text-sm text-muted-foreground">Consumo − gasto total</p><p className="text-2xl font-bold">{spent === null ? "—" : `${intake - spent} kcal`}</p></div>
    </div>
    <p className="mb-4 text-xs text-muted-foreground">{spent === null ? "Sem medidas completas, mostramos somente o gasto das atividades, não o metabolismo basal. Sem peso, a faixa é genérica." : "Metabolismo de repouso × 1,2 + atividade adicional, sem contar repouso duas vezes."} São aproximações, não medições ou recomendações médicas.</p>
    {!p?.health_consent_at && <p className="mb-4 text-sm text-muted-foreground">O registro de alimentação e atividades precisa da sua autorização de saúde. Ela é opcional.</p>}
    <form className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]" onSubmit={async e => {
      e.preventDefault(); if (!text.trim()) return; setBusy(true);
      try { const result = await auto({ data: { text, date } }); setText(""); await qc.invalidateQueries({ queryKey: ["energy_activities"] }); toast.success(`${result.activity} salva · cerca de ${Math.round(result.calories)} kcal adicionais.`); }
      catch (error) { toast.error(error instanceof Error && !/[{}<>]/.test(error.message) ? error.message : "Não foi possível registrar a atividade."); }
      finally { setBusy(false); }
    }}>
      <Input aria-label="Atividade realizada" placeholder="Corri por 15 minutos" maxLength={500} required value={text} onChange={e => setText(e.target.value)} />
      <Input aria-label="Data da atividade" type="date" required value={date} onChange={e => setDate(e.target.value)} />
      <Button disabled={!p?.health_consent_at || busy}><Sparkles className="size-4" />{busy ? "Calculando…" : "Registrar atividade"}</Button>
    </form>
    {activities.map(x => <div key={x.id} className="flex flex-wrap items-center gap-2 border-b py-3 text-sm"><div className="min-w-0 flex-1"><p>{x.activity} · {x.minutes} min · {x.occurred_on}</p><p className="text-xs text-muted-foreground">{x.personalized ? "Estimativa com seu peso" : "Faixa genérica · sem peso informado"}</p></div><span>{x.calories_low !== null && x.calories_high !== null ? `${Math.round(x.calories_low)}–${Math.round(x.calories_high)}` : Math.round(x.calories)} kcal adicionais</span><Button aria-label={`Excluir atividade ${x.activity}`} variant="ghost" size="icon" onClick={() => am.remove.mutate(x.id)}><Trash2 className="size-4" /></Button></div>)}
  </section>;
}
