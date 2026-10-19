import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Clock, Wallet, Salad, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { savePreferences } from "@/lib/preferences.functions";
import { preferencesSchema, type PreferencesInput } from "@/lib/onboarding";
import i18n, { LANGS } from "@/lib/i18n";
import { Logo } from "./Logo";
import { Prefs } from "./Prefs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";

export const preferencesQuery = {
  queryKey: ["user-preferences"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Entre novamente para continuar.");
    const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (error) throw new Error("Não foi possível carregar suas preferências.");
    return data;
  },
};
const focus = [{ id: "time", label: "Organizar meu tempo", icon: Clock }, { id: "money", label: "Cuidar do meu dinheiro", icon: Wallet }, { id: "body", label: "Cuidar da alimentação e energia", icon: Salad }] as const;

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const query = useQuery(preferencesQuery);
  if (query.isPending) return <div className="p-10 text-muted-foreground">Preparando seu Zero…</div>;
  if (query.isError) return <div className="p-10"><p>{query.error.message}</p><Button className="mt-4" onClick={() => query.refetch()}>Tentar novamente</Button></div>;
  if (!query.data?.onboarding_completed_at) return <Onboarding />;
  return children;
}

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const qc = useQueryClient(), save = useServerFn(savePreferences);
  const { data: previous } = useQuery(preferencesQuery);
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false);
  const [name, setName] = useState(previous?.display_name ?? "");
  const [goals, setGoals] = useState<PreferencesInput["goals"]>(previous?.goals as PreferencesInput["goals"] ?? ["time", "money"]);
  const [language, setLanguage] = useState(previous?.language ?? i18n.language.slice(0, 2));
  const [currency, setCurrency] = useState(previous?.currency ?? "BRL");
  const [health, setHealth] = useState(Boolean(previous?.health_consent_at));
  const [measurements, setMeasurements] = useState({ weight: previous?.weight_kg?.toString() ?? "", height: previous?.height_cm?.toString() ?? "", age: previous?.age?.toString() ?? "", sex: previous?.sex ?? "" });
  const [notice, setNotice] = useState(false);
  const titles = ["Vamos começar pelo que importa.", "Seu ritmo. Suas escolhas.", "Seu corpo, sem obrigação.", "Seus dados, suas decisões."];
  async function finish() {
    const values = { display_name: name, goals, language, currency, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, health_consent: health,
      weight_kg: health && measurements.weight ? Number(measurements.weight) : null,
      height_cm: health && measurements.height ? Number(measurements.height) : null,
      age: health && measurements.age ? Number(measurements.age) : null,
      sex: health && measurements.sex ? measurements.sex : null };
    const parsed = preferencesSchema.safeParse(values);
    if (!parsed.success) { toast.error("Confira suas medidas e escolhas antes de continuar."); setStep(2); return; }
    setBusy(true);
    try { await save({ data: parsed.data }); await i18n.changeLanguage(language); localStorage.setItem("zero-lang", language); await qc.invalidateQueries({ queryKey: preferencesQuery.queryKey }); onDone?.(); }
    catch { toast.error("Não foi possível salvar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8 sm:px-10">
    <header className="mb-12 flex items-center justify-between"><Logo /><Prefs /></header>
    <div className="mb-7 flex items-center gap-2" aria-label={`Etapa ${step + 1} de 4`}>{titles.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
    <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Seu Zero · {step + 1} de 4</p>
    <h1 className="mb-7 font-display text-3xl font-semibold">{titles[step]}</h1>
    <div className="min-h-72 space-y-5">
      {step === 0 && <><label className="block space-y-2"><span className="text-sm font-medium">Como quer ser chamado? <span className="text-muted-foreground">(opcional)</span></span><Input aria-label="Seu nome" maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Seu primeiro nome" /></label><p className="text-sm font-medium">O que você quer priorizar?</p><div className="grid gap-3">{focus.map(item => <Button key={item.id} variant={goals.includes(item.id) ? "default" : "outline"} className="h-auto justify-start gap-3 whitespace-normal py-4 text-left" onClick={() => setGoals(goals.includes(item.id) ? goals.filter(x => x !== item.id) : [...goals, item.id])}><item.icon className="size-5 shrink-0" /><span className="flex-1">{item.label}</span>{goals.includes(item.id) && <Check className="size-4 shrink-0" />}</Button>)}</div></>}
      {step === 1 && <><label className="block space-y-2"><span>Idioma</span><select aria-label="Idioma do assistente" className="h-11 w-full rounded-md border bg-background px-3" value={language} onChange={e => setLanguage(e.target.value)}>{LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label><label className="block space-y-2"><span>Moeda dos registros</span><select aria-label="Moeda" className="h-11 w-full rounded-md border bg-background px-3" value={currency} onChange={e => setCurrency(e.target.value)}><option value="BRL">Real · BRL</option><option value="USD">Dólar · USD</option><option value="EUR">Euro · EUR</option><option value="GBP">Libra · GBP</option></select></label><p className="text-sm text-muted-foreground">Nenhuma tarefa, hábito ou gasto será criado por você. Suas escolhas não alteram o preço dos planos.</p></>}
      {step === 2 && <><p className="text-sm text-muted-foreground">Peso e altura são opcionais. Sem peso, a atividade recebe uma faixa genérica de calorias; não uma estimativa personalizada.</p><label className="flex items-start gap-3 text-sm"><Checkbox checked={health} onCheckedChange={v => setHealth(v === true)} /><span>Autorizo o uso dos meus registros de alimentação, atividades e medidas para estimativas de energia. O texto e as medidas necessários são enviados à Groq para cálculo por IA. Posso retirar esta autorização depois.</span></label>{health && <div className="grid gap-4 sm:grid-cols-2">{[{ key: "weight", label: "Peso (kg)", min: 20, max: 350 }, { key: "height", label: "Altura (cm)", min: 80, max: 250 }, { key: "age", label: "Idade (18+)", min: 18, max: 100 }].map(field => <label key={field.key} className="space-y-2"><span className="text-sm">{field.label} · opcional</span><Input aria-label={field.label} type="number" min={field.min} max={field.max} step={field.key === "weight" ? "0.1" : "1"} value={measurements[field.key as "weight" | "height" | "age"]} onChange={e => setMeasurements({ ...measurements, [field.key]: e.target.value })} /></label>)}<label className="space-y-2"><span className="text-sm">Sexo para cálculo basal · opcional</span><select aria-label="Sexo para cálculo basal" className="h-9 w-full rounded-md border bg-background px-2" value={measurements.sex} onChange={e => setMeasurements({ ...measurements, sex: e.target.value })}><option value="">Prefiro não informar</option><option value="female">Feminino</option><option value="male">Masculino</option></select></label></div>}<p className="text-xs text-muted-foreground">Estimativas para adultos, não substituem orientação médica. O cálculo basal só aparece com medidas completas.</p></>}
      {step === 3 && <><ShieldCheck className="size-10 text-primary" /><p className="text-sm">Suas conversas, tarefas, finanças e dados de saúde são privados à sua conta. Não aparecem para outros usuários.</p><p className="text-sm text-muted-foreground">O Zero usa serviços de hospedagem e autenticação para guardar sua conta, Groq para responder e calcular, ElevenLabs quando a voz premium é usada e Paddle para pagamentos. Esses serviços podem processar dados fora do Brasil. Nunca envie senhas ou dados bancários secretos ao chat.</p><p className="text-sm text-muted-foreground">Em Privacidade você pode revisar escolhas, exportar registros e retirar a autorização de saúde. Dados obrigatórios de cobrança podem precisar ser mantidos por obrigação legal.</p><label className="flex items-start gap-3 text-sm"><Checkbox checked={notice} onCheckedChange={v => setNotice(v === true)} /><span>Li como meus dados são utilizados. A autorização de saúde acima é opcional e independente.</span></label></>}
    </div>
    <footer className="mt-8 flex justify-between gap-3 border-t pt-6"><Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" />Voltar</Button><Button disabled={busy || (step === 0 && !goals.length) || (step === 3 && !notice)} onClick={() => step === 3 ? finish() : setStep(step + 1)}>{busy ? "Salvando…" : step === 3 ? "Começar meu Zero" : "Continuar"}<ArrowRight className="size-4" /></Button></footer>
  </div>;
}