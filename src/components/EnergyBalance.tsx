import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { today, useRows, useTableMutations } from "@/lib/data";
import { ACTIVITIES, activityCalories, dailyExpenditure, type EnergyProfile } from "@/lib/planning";
type Profile = EnergyProfile & { id: string };
type Activity = { id: string; activity: string; minutes: number; calories: number; occurred_on: string };
export function EnergyBalance({ intake }: { intake: number }) {
  const { data: profiles = [] } = useRows<Profile>("energy_profiles");
  const { data: activities = [] } = useRows<Activity>("energy_activities");
  const pm = useTableMutations("energy_profiles"), am = useTableMutations("energy_activities");
  const profile = profiles[0];
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ weight_kg: "", height_cm: "", age: "", sex: "female" });
  const [a, setA] = useState({ activity: "walk" as keyof typeof ACTIVITIES, minutes: "30", date: today() });
  const current = activities.filter(x => x.occurred_on === today());
  const extra = current.reduce((sum, x) => sum + Number(x.calories), 0);
  const spent = profile ? dailyExpenditure(profile, extra) : null;
  return <section className="mb-8 border-y py-6">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Balanço energético</h2>{profile && <Button variant="outline" size="sm" onClick={() => { setF({ weight_kg: String(profile.weight_kg), height_cm: String(profile.height_cm), age: String(profile.age), sex: profile.sex }); setEdit(!edit); }}>Editar medidas</Button>}</div>
    {(!profile || edit) && <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" onSubmit={async e => {
      e.preventDefault(); const row = { weight_kg: Number(f.weight_kg), height_cm: Number(f.height_cm), age: Number(f.age), sex: f.sex };
      if (profile) await pm.update.mutateAsync({ id: profile.id, ...row }); else await pm.insert.mutateAsync(row); setEdit(false);
    }}>
      <Input aria-label="Peso em kg" placeholder="Peso (kg)" type="number" min="20" max="350" step="0.1" required value={f.weight_kg} onChange={e => setF({ ...f, weight_kg: e.target.value })}/>
      <Input aria-label="Altura em cm" placeholder="Altura (cm)" type="number" min="80" max="250" required value={f.height_cm} onChange={e => setF({ ...f, height_cm: e.target.value })}/>
      <Input aria-label="Idade" placeholder="Idade (18+)" type="number" min="18" max="100" required value={f.age} onChange={e => setF({ ...f, age: e.target.value })}/>
      <select aria-label="Sexo para cálculo metabólico" className="h-9 rounded-md border bg-background px-2 text-sm" value={f.sex} onChange={e => setF({ ...f, sex: e.target.value })}><option value="female">Sexo feminino</option><option value="male">Sexo masculino</option></select>
      <Button disabled={pm.insert.isPending || pm.update.isPending}>Salvar medidas</Button>
    </form>}
    <div className="mb-4 grid gap-4 sm:grid-cols-3">
      <div><p className="text-sm text-muted-foreground">Consumo hoje</p><p className="text-2xl font-bold">{intake} kcal</p></div>
      <div><p className="text-sm text-muted-foreground">Gasto estimado hoje</p><p className="text-2xl font-bold">{spent === null ? "—" : `${spent} kcal`}</p></div>
      <div><p className="text-sm text-muted-foreground">Consumo − gasto</p><p className="text-2xl font-bold">{spent === null ? "—" : `${intake - spent} kcal`}</p></div>
    </div>
    <p className="mb-4 text-xs text-muted-foreground">Estimativa para adultos: metabolismo de repouso × 1,2 + atividade adicional. Não é uma medição nem recomendação clínica; o saldo muda ao registrar refeições.</p>
    <form className="mb-3 grid gap-2 sm:grid-cols-[1fr_110px_150px_auto]" onSubmit={async e => { e.preventDefault(); if (!profile) return; await am.insert.mutateAsync({ activity: ACTIVITIES[a.activity].label, minutes: Number(a.minutes), calories: activityCalories(ACTIVITIES[a.activity].met, Number(profile.weight_kg), Number(a.minutes)), occurred_on: a.date }); }}>
      <select aria-label="Atividade" className="h-9 rounded-md border bg-background px-2 text-sm" value={a.activity} onChange={e => setA({ ...a, activity: e.target.value as keyof typeof ACTIVITIES })}>{Object.entries(ACTIVITIES).map(([id, value]) => <option key={id} value={id}>{value.label}</option>)}</select>
      <Input aria-label="Duração da atividade em minutos" type="number" min="1" max="1440" required value={a.minutes} onChange={e => setA({ ...a, minutes: e.target.value })}/>
      <Input aria-label="Data da atividade" type="date" required value={a.date} onChange={e => setA({ ...a, date: e.target.value })}/>
      <Button disabled={!profile || am.insert.isPending}>Registrar atividade</Button>
    </form>
    {activities.map(x => <div key={x.id} className="flex flex-wrap items-center gap-2 border-b py-2 text-sm"><span className="flex-1">{x.activity} · {x.minutes} min · {x.occurred_on}</span><span>{x.calories} kcal adicionais</span><Button aria-label={`Excluir atividade ${x.activity}`} variant="ghost" size="icon" onClick={() => am.remove.mutate(x.id)}><Trash2 className="size-4"/></Button></div>)}
  </section>;
}