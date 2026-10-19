import { useTranslation } from "react-i18next";
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
    if (!auth.user) throw new Error(i18n.t("onboarding.authError"));
    const { data, error } = await supabase.from("user_preferences").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (error) throw new Error(i18n.t("onboarding.loadError"));
    return data;
  },
};
const focus = [{ id: "time", label: "onboarding.time", icon: Clock }, { id: "money", label: "onboarding.money", icon: Wallet }, { id: "body", label: "onboarding.body", icon: Salad }] as const;

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const query = useQuery(preferencesQuery);
  if (query.isPending) return <div className="p-10 text-muted-foreground">{t("onboarding.preparing")}</div>;
  if (query.isError) return <div className="p-10"><p>{query.error.message}</p><Button className="mt-4" onClick={() => query.refetch()}>{t("shell.retry")}</Button></div>;
  if (!query.data?.onboarding_completed_at) return <Onboarding />;
  return children;
}

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
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
  const titles = [t("onboarding.title1"), t("onboarding.title2"), t("onboarding.title3"), t("onboarding.title4")];
  async function finish() {
    const values = { display_name: name, goals, language, currency, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, health_consent: health,
      weight_kg: health && measurements.weight ? Number(measurements.weight) : null,
      height_cm: health && measurements.height ? Number(measurements.height) : null,
      age: health && measurements.age ? Number(measurements.age) : null,
      sex: health && measurements.sex ? measurements.sex : null };
    const parsed = preferencesSchema.safeParse(values);
    if (!parsed.success) { toast.error(t("onboarding.validation")); setStep(2); return; }
    setBusy(true);
    try { await save({ data: parsed.data }); await i18n.changeLanguage(language); localStorage.setItem("zero-lang", language); await qc.invalidateQueries({ queryKey: preferencesQuery.queryKey }); onDone?.(); }
    catch { toast.error(t("onboarding.saveError")); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8 sm:px-10">
    <header className="mb-12 flex items-center justify-between"><Logo /><Prefs /></header>
    <div className="mb-7 flex items-center gap-2" aria-label={t("onboarding.step", { value: step + 1 })}>{titles.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
    <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{t("onboarding.progress", { value: step + 1 })}</p>
    <h1 className="mb-7 font-display text-3xl font-semibold">{titles[step]}</h1>
    <div className="min-h-72 space-y-5">
      {step === 0 && <><label className="block space-y-2"><span className="text-sm font-medium">{t("onboarding.called")} <span className="text-muted-foreground">({t("shell.optional")})</span></span><Input aria-label={t("onboarding.name")} maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder={t("onboarding.firstName")} /></label><p className="text-sm font-medium">{t("onboarding.prioritize")}</p><div className="grid gap-3">{focus.map(item => <Button key={item.id} variant={goals.includes(item.id) ? "default" : "outline"} className="h-auto justify-start gap-3 whitespace-normal py-4 text-left" onClick={() => setGoals(goals.includes(item.id) ? goals.filter(x => x !== item.id) : [...goals, item.id])}><item.icon className="size-5 shrink-0" /><span className="flex-1">{t(item.label)}</span>{goals.includes(item.id) && <Check className="size-4 shrink-0" />}</Button>)}</div></>}
      {step === 1 && <><label className="block space-y-2"><span>{t("shell.language")}</span><select aria-label={t("onboarding.language")} className="h-11 w-full rounded-md border bg-background px-3" value={language} onChange={e => setLanguage(e.target.value)}>{LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label><label className="block space-y-2"><span>{t("onboarding.recordCurrency")}</span><select aria-label={t("onboarding.currency")} className="h-11 w-full rounded-md border bg-background px-3" value={currency} onChange={e => setCurrency(e.target.value)}><option value="BRL">{t("onboarding.brl")}</option><option value="USD">{t("onboarding.usd")}</option><option value="EUR">{t("onboarding.eur")}</option><option value="GBP">{t("onboarding.gbp")}</option></select></label><p className="text-sm text-muted-foreground">{t("onboarding.noRecords")}</p></>}
      {step === 2 && <><p className="text-sm text-muted-foreground">{t("onboarding.measurements")}</p><label className="flex items-start gap-3 text-sm"><Checkbox checked={health} onCheckedChange={v => setHealth(v === true)} /><span>{t("onboarding.consent")}</span></label>{health && <div className="grid gap-4 sm:grid-cols-2">{[{ key: "weight", label: t("onboarding.weight"), min: 20, max: 350 }, { key: "height", label: t("onboarding.height"), min: 80, max: 250 }, { key: "age", label: t("onboarding.age"), min: 18, max: 100 }].map(field => <label key={field.key} className="space-y-2"><span className="text-sm">{field.label} · {t("shell.optional")}</span><Input aria-label={field.label} type="number" min={field.min} max={field.max} step={field.key === "weight" ? "0.1" : "1"} value={measurements[field.key as "weight" | "height" | "age"]} onChange={e => setMeasurements({ ...measurements, [field.key]: e.target.value })} /></label>)}<label className="space-y-2"><span className="text-sm">{t("onboarding.sex")} · {t("shell.optional")}</span><select aria-label={t("onboarding.sex")} className="h-9 w-full rounded-md border bg-background px-2" value={measurements.sex} onChange={e => setMeasurements({ ...measurements, sex: e.target.value })}><option value="">{t("onboarding.private")}</option><option value="female">{t("onboarding.female")}</option><option value="male">{t("onboarding.male")}</option></select></label></div>}<p className="text-xs text-muted-foreground">{t("onboarding.medical")}</p></>}
      {step === 3 && <><ShieldCheck className="size-10 text-primary" /><p className="text-sm">{t("onboarding.privacy")}</p><p className="text-sm text-muted-foreground">{t("onboarding.services")}</p><p className="text-sm text-muted-foreground">{t("onboarding.controls")}</p><label className="flex items-start gap-3 text-sm"><Checkbox checked={notice} onCheckedChange={v => setNotice(v === true)} /><span>{t("onboarding.read")}</span></label></>}
    </div>
    <footer className="mt-8 flex justify-between gap-3 border-t pt-6"><Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" />{t("shell.back")}</Button><Button disabled={busy || (step === 0 && !goals.length) || (step === 3 && !notice)} onClick={() => step === 3 ? finish() : setStep(step + 1)}>{busy ? t("shell.saving") : step === 3 ? t("onboarding.start") : t("shell.continue")}<ArrowRight className="size-4" /></Button></footer>
  </div>;
}