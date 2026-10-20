import { useTranslation } from "react-i18next";
import { Component, useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Clock, Wallet, Salad, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { savePreferences } from "@/lib/preferences.functions";
import { preferencesSchema, PRIORITIES, DIET_GOALS, ACTIVITY_LEVELS, RESTRICTIONS, type PreferencesInput } from "@/lib/onboarding";
import i18n, { LANGS } from "@/lib/i18n";
import { heightToCm, setUnits, useUnits, weightToKg, weightValue, type CurrencyCode } from "@/lib/units";
import { Logo } from "./Logo";
import { Prefs } from "./Prefs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";

export const preferencesQuery = {
  queryKey: ["user-preferences"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error(i18n.t("onboarding.authError"));
    const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (error) throw new Error(i18n.t("onboarding.loadError"));
    return data;
  },
};
const focus = [{ id: "time", label: "onboarding.time", icon: Clock }, { id: "money", label: "onboarding.money", icon: Wallet }, { id: "body", label: "onboarding.body", icon: Salad }] as const;

// English last-resort copy, used only when the translation files themselves failed to load.
const RECOVERY_FALLBACK = { recoveryTitle: "Something didn't load", recoveryBody: "We couldn't open this step right now. Your data is safe.", recoveryRetry: "Try again", recoveryReload: "Reload page" } as const;
function recoveryText(key: keyof typeof RECOVERY_FALLBACK) {
  try { const v = i18n.t(`onboarding.${key}`); return v && v !== `onboarding.${key}` ? v : RECOVERY_FALLBACK[key]; } catch { return RECOVERY_FALLBACK[key]; }
}

/** Full-screen recovery shown instead of a blank app when onboarding fails to load or render. */
export function OnboardingRecovery({ onRetry }: { onRetry: () => void }) {
  return (
    <main role="alert" className="grid h-dvh place-items-center overflow-y-auto p-6">
      <section className="w-full max-w-sm text-center">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-8 text-2xl font-bold">{recoveryText("recoveryTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{recoveryText("recoveryBody")}</p>
        <div className="mt-6 grid gap-2">
          <Button onClick={onRetry}><RefreshCw className="size-4" />{recoveryText("recoveryRetry")}</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>{recoveryText("recoveryReload")}</Button>
        </div>
      </section>
    </main>
  );
}

class OnboardingBoundary extends Component<{ children: ReactNode; onReset: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: unknown) { console.error("Onboarding failed to render", error); }
  override render() {
    if (this.state.failed) return <OnboardingRecovery onRetry={() => { this.setState({ failed: false }); this.props.onReset(); }} />;
    return this.props.children;
  }
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    void i18n.reloadResources?.().catch(() => {});
    void qc.invalidateQueries({ queryKey: preferencesQuery.queryKey });
    setAttempt((n) => n + 1);
  };
  return <OnboardingBoundary key={attempt} onReset={retry}><GateContent onRetry={retry}>{children}</GateContent></OnboardingBoundary>;
}

function GateContent({ children, onRetry }: { children: React.ReactNode; onRetry: () => void }) {
  const { t } = useTranslation();
  const query = useQuery({ ...preferencesQuery, retry: 2 });
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!query.isPending) { setSlow(false); return; }
    const id = setTimeout(() => setSlow(true), 15_000);
    return () => clearTimeout(id);
  }, [query.isPending]);
  if (query.isError || (query.isPending && slow)) return <OnboardingRecovery onRetry={() => { setSlow(false); onRetry(); void query.refetch(); }} />;
  if (query.isPending) return <div className="grid h-dvh place-items-center p-10 text-muted-foreground">{t("onboarding.preparing")}</div>;
  // Mandatory: no app navigation is rendered until onboarding is saved.
  if (!query.data?.onboarding_completed_at) return <div className="h-dvh overflow-y-auto"><Onboarding /></div>;
  return children;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const sel = "h-11 w-full rounded-md border bg-background px-3";

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button type="button" variant={on ? "default" : "outline"} className="h-auto min-h-10 justify-start gap-2 whitespace-normal py-2 text-left" aria-pressed={on} onClick={onClick}>{on && <Check className="size-4 shrink-0" />}<span className="flex-1">{children}</span></Button>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-2"><span className="text-sm">{label}</span>{children}</label>;
}

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const units = useUnits();
  const qc = useQueryClient(), save = useServerFn(savePreferences);
  const { data: previous } = useQuery(preferencesQuery);
  const p = previous as (typeof previous & Partial<Record<string, unknown>>) | undefined;
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false);
  const [name, setName] = useState(previous?.display_name ?? "");
  const [goals, setGoals] = useState<PreferencesInput["goals"]>(previous?.goals as PreferencesInput["goals"] ?? ["time", "money"]);
  const [priorities, setPriorities] = useState<string[]>((p?.priorities as string[] | undefined) ?? []);
  const [routine, setRoutine] = useState({ wake: (p?.wake_time as string) ?? "", sleep: (p?.sleep_time as string) ?? "", workStart: (p?.work_start as string) ?? "", workEnd: (p?.work_end as string) ?? "" });
  const [freeDays, setFreeDays] = useState<number[]>((p?.free_days as number[] | undefined) ?? [0, 6]);
  const [language, setLanguage] = useState(previous?.language ?? i18n.language.slice(0, 2));
  const [currency, setCurrency] = useState(previous?.currency ?? "BRL");
  const [income, setIncome] = useState(p?.monthly_income != null ? String(p.monthly_income) : "");
  const [budget, setBudget] = useState(p?.monthly_budget != null ? String(p.monthly_budget) : "");
  const [health, setHealth] = useState(Boolean(previous?.health_consent_at));
  const [dietGoal, setDietGoal] = useState((p?.diet_goal as string) ?? "");
  const [activity, setActivity] = useState((p?.activity_level as string) ?? "");
  const [restrictions, setRestrictions] = useState<string[]>((p?.dietary_restrictions as string[] | undefined) ?? []);
  const [measurements, setMeasurements] = useState(() => ({
    weight: previous?.weight_kg ? weightValue(Number(previous.weight_kg), units).toFixed(1).replace(/\.0$/, "") : "",
    height: previous?.height_cm ? (units.height === "ft" ? (Number(previous.height_cm) / 30.48).toFixed(2).replace(/0$/, "").replace(/\.$/, "") : String(Math.round(Number(previous.height_cm)))) : "",
    age: previous?.age?.toString() ?? "",
    sex: previous?.sex ?? "",
  }));
  const [notice, setNotice] = useState(false);
  const titles = [t("onboarding.title1"), t("onboarding.titlePriorities"), t("onboarding.titleRoutine"), t("onboarding.titleMoney"), t("onboarding.title3"), t("onboarding.title4")];
  const last = titles.length - 1;
  const toggle = (list: string[], v: string, max = 99) => list.includes(v) ? list.filter(x => x !== v) : list.length >= max ? list : [...list, v];
  const num = (v: string) => v.trim() === "" ? null : Number(v.replace(",", "."));
  const time = (v: string) => v || null;

  async function finish() {
    const values = { display_name: name, goals, language, currency, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, health_consent: health,
      weight_kg: health && measurements.weight ? Math.round(weightToKg(Number(measurements.weight), units) * 10) / 10 : null,
      height_cm: health && measurements.height ? Math.round(heightToCm(Number(measurements.height), units)) : null,
      age: health && measurements.age ? Number(measurements.age) : null,
      sex: health && measurements.sex ? measurements.sex : null,
      priorities, wake_time: time(routine.wake), sleep_time: time(routine.sleep), work_start: time(routine.workStart), work_end: time(routine.workEnd), free_days: freeDays,
      monthly_income: num(income), monthly_budget: num(budget),
      diet_goal: health && dietGoal ? dietGoal : null, activity_level: health && activity ? activity : null, dietary_restrictions: health ? restrictions : [] };
    const parsed = preferencesSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(t("onboarding.validation"));
      const path = String(parsed.error.issues[0]?.path[0] ?? "");
      setStep(path.includes("time") || path.includes("work") || path === "free_days" ? 2 : path.startsWith("monthly") ? 3 : 4);
      return;
    }
    setBusy(true);
    try { await save({ data: parsed.data }); setUnits({ currency: parsed.data.currency as CurrencyCode }); await i18n.changeLanguage(language); localStorage.setItem("zero-lang", language); await qc.invalidateQueries({ queryKey: preferencesQuery.queryKey }); onDone?.(); }
    catch { toast.error(t("onboarding.saveError")); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8 sm:px-10">
    <header className="mb-12 flex items-center justify-between"><Logo /><Prefs /></header>
    <div className="mb-7 flex items-center gap-2" aria-label={t("onboarding.step", { value: step + 1 })}>{titles.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
    <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{t("onboarding.progressOf", { value: step + 1, total: titles.length })}</p>
    <h1 className="mb-7 font-display text-3xl font-semibold">{titles[step]}</h1>
    <div className="min-h-72 space-y-5">
      {step === 0 && <><label className="block space-y-2"><span className="text-sm font-medium">{t("onboarding.called")} <span className="text-muted-foreground">({t("shell.optional")})</span></span><Input aria-label={t("onboarding.name")} maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder={t("onboarding.firstName")} /></label><p className="text-sm font-medium">{t("onboarding.prioritize")}</p><div className="grid gap-3">{focus.map(item => <Button key={item.id} variant={goals.includes(item.id) ? "default" : "outline"} className="h-auto justify-start gap-3 whitespace-normal py-4 text-left" onClick={() => setGoals(goals.includes(item.id) ? goals.filter(x => x !== item.id) : [...goals, item.id])}><item.icon className="size-5 shrink-0" /><span className="flex-1">{t(item.label)}</span>{goals.includes(item.id) && <Check className="size-4 shrink-0" />}</Button>)}</div></>}
      {step === 1 && <><p className="text-sm text-muted-foreground">{t("onboarding.prioritiesHint")}</p><div className="grid gap-2 sm:grid-cols-2">{PRIORITIES.map(v => <Chip key={v} on={priorities.includes(v)} onClick={() => setPriorities(toggle(priorities, v, 3))}>{t(`onboarding.pr_${v}`)}</Chip>)}</div><p className="text-xs text-muted-foreground">{t("onboarding.prioritiesCount", { value: priorities.length })}</p></>}
      {step === 2 && <><p className="text-sm text-muted-foreground">{t("onboarding.routineHint")}</p><div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("onboarding.wake")}><Input type="time" value={routine.wake} onChange={e => setRoutine({ ...routine, wake: e.target.value })} /></Field>
        <Field label={t("onboarding.sleep")}><Input type="time" value={routine.sleep} onChange={e => setRoutine({ ...routine, sleep: e.target.value })} /></Field>
        <Field label={t("onboarding.workStart")}><Input type="time" value={routine.workStart} onChange={e => setRoutine({ ...routine, workStart: e.target.value })} /></Field>
        <Field label={t("onboarding.workEnd")}><Input type="time" value={routine.workEnd} onChange={e => setRoutine({ ...routine, workEnd: e.target.value })} /></Field>
      </div><p className="text-sm font-medium">{t("onboarding.freeDays")}</p><div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{DAYS.map(d => <Chip key={d} on={freeDays.includes(d)} onClick={() => setFreeDays(freeDays.includes(d) ? freeDays.filter(x => x !== d) : [...freeDays, d])}>{t(`onboarding.day${d}`)}</Chip>)}</div></>}
      {step === 3 && <><div className="grid gap-4 sm:grid-cols-2"><Field label={t("shell.language")}><select aria-label={t("onboarding.language")} className={sel} value={language} onChange={e => setLanguage(e.target.value)}>{LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></Field><Field label={t("onboarding.recordCurrency")}><select aria-label={t("onboarding.currency")} className={sel} value={currency} onChange={e => setCurrency(e.target.value)}><option value="BRL">{t("onboarding.brl")}</option><option value="USD">{t("onboarding.usd")}</option><option value="EUR">{t("onboarding.eur")}</option><option value="GBP">{t("onboarding.gbp")}</option><option value="JPY">JPY (¥)</option><option value="CHF">CHF</option></select></Field>
        <Field label={`${t("onboarding.income")} (${currency}) · ${t("shell.optional")}`}><Input inputMode="decimal" type="number" min={0} value={income} onChange={e => setIncome(e.target.value)} /></Field>
        <Field label={`${t("onboarding.budget")} (${currency}) · ${t("shell.optional")}`}><Input inputMode="decimal" type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} /></Field></div>
        <p className="text-sm text-muted-foreground">{t("onboarding.moneyHint")}</p><p className="text-sm text-muted-foreground">{t("onboarding.noRecords")}</p></>}
      {step === 4 && <><p className="text-sm text-muted-foreground">{t("onboarding.measurements")}</p><label className="flex items-start gap-3 text-sm"><Checkbox checked={health} onCheckedChange={v => setHealth(v === true)} /><span>{t("onboarding.consent")}</span></label>{health && <><div className="grid gap-4 sm:grid-cols-2">{[{ key: "weight", label: `${t("onboarding.weight")} (${units.weight})`, min: units.weight === "lb" ? 44 : 20, max: units.weight === "lb" ? 770 : 350, step: "0.1" }, { key: "height", label: `${t("onboarding.height")} (${units.height === "ft" ? "ft" : "cm"})`, min: units.height === "ft" ? 2.6 : 80, max: units.height === "ft" ? 8.2 : 250, step: units.height === "ft" ? "0.01" : "1" }, { key: "age", label: t("onboarding.age"), min: 18, max: 100, step: "1" }].map(field => <label key={field.key} className="space-y-2"><span className="text-sm">{field.label} · {t("shell.optional")}</span><Input aria-label={field.label} type="number" min={field.min} max={field.max} step={field.step} value={measurements[field.key as "weight" | "height" | "age"]} onChange={e => setMeasurements({ ...measurements, [field.key]: e.target.value })} /></label>)}<label className="space-y-2"><span className="text-sm">{t("onboarding.sex")} · {t("shell.optional")}</span><select aria-label={t("onboarding.sex")} className="h-9 w-full rounded-md border bg-background px-2" value={measurements.sex} onChange={e => setMeasurements({ ...measurements, sex: e.target.value })}><option value="">{t("onboarding.private")}</option><option value="female">{t("onboarding.female")}</option><option value="male">{t("onboarding.male")}</option></select></label>
        <Field label={`${t("onboarding.dietGoal")} · ${t("shell.optional")}`}><select className={sel} value={dietGoal} onChange={e => setDietGoal(e.target.value)}><option value="">—</option>{DIET_GOALS.map(v => <option key={v} value={v}>{t(`onboarding.dg_${v}`)}</option>)}</select></Field>
        <Field label={`${t("onboarding.activity")} · ${t("shell.optional")}`}><select className={sel} value={activity} onChange={e => setActivity(e.target.value)}><option value="">—</option>{ACTIVITY_LEVELS.map(v => <option key={v} value={v}>{t(`onboarding.al_${v}`)}</option>)}</select></Field></div>
        <p className="text-sm font-medium">{t("onboarding.restrictions")}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{RESTRICTIONS.map(v => <Chip key={v} on={restrictions.includes(v)} onClick={() => setRestrictions(toggle(restrictions, v))}>{t(`onboarding.rs_${v}`)}</Chip>)}</div></>}<p className="text-xs text-muted-foreground">{t("onboarding.medical")}</p></>}
      {step === 5 && <><ShieldCheck className="size-10 text-primary" /><p className="text-sm">{t("onboarding.privacy")}</p><p className="text-sm text-muted-foreground">{t("onboarding.services")}</p><p className="text-sm text-muted-foreground">{t("onboarding.controls")}</p><label className="flex items-start gap-3 text-sm"><Checkbox checked={notice} onCheckedChange={v => setNotice(v === true)} /><span>{t("onboarding.read")}</span></label></>}
    </div>
    <footer className="mt-8 flex justify-between gap-3 border-t pt-6"><Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" />{t("shell.back")}</Button><Button disabled={busy || (step === 0 && !goals.length) || (step === last && !notice)} onClick={() => step === last ? finish() : setStep(step + 1)}>{busy ? t("shell.saving") : step === last ? t("onboarding.start") : t("shell.continue")}<ArrowRight className="size-4" /></Button></footer>
  </div>;
}
