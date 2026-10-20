import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { broadcastNotification, listCoupons, createCoupon, archiveCoupon } from "@/lib/admin.functions";
import { Card } from "./Page";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";

const sel = "h-9 rounded-md border bg-background px-2 text-sm";
const err = (e: unknown, fallback: string) => toast.error(e instanceof Error ? e.message : fallback);

export function AdminBroadcast() {
  const { t } = useTranslation();
  const send = useServerFn(broadcastNotification);
  const [f, setF] = useState({ audience: "all", title: "", body: "", link: "" });
  const m = useMutation({
    mutationFn: () => send({ data: { audience: f.audience as "all", title: f.title, body: f.body || undefined, link: f.link || undefined } }),
    onSuccess: (r) => { toast.success(t("adminx.broadcastSent", { value: r.sent })); setF({ ...f, title: "", body: "", link: "" }); },
    onError: (e) => err(e, t("adminx.error")),
  });
  return (
    <Card className="space-y-3">
      <p className="font-display font-semibold">{t("adminx.broadcastTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("adminx.broadcastHint")}</p>
      <select aria-label={t("adminx.audience")} className={sel} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
        {(["all", "free", "paid", "essencial", "pro", "max"] as const).map((a) => <option key={a} value={a}>{t(`adminx.aud_${a}`)}</option>)}
      </select>
      <Input placeholder={t("admin.notificationTitle")} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <Input placeholder={t("admin.message")} maxLength={400} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <Input placeholder={t("adminx.linkPlaceholder")} value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
      <Button disabled={!f.title.trim() || m.isPending} onClick={() => { if (window.confirm(t("adminx.broadcastConfirm"))) m.mutate(); }}>{m.isPending ? t("shell.saving") : t("admin.send")}</Button>
    </Card>
  );
}

type Promo = { id: string; title: string; body: string | null; cta_label: string | null; cta_url: string | null; image_url: string | null; active: boolean; starts_at: string | null; ends_at: string | null };

export function AdminPromotions() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-promos"],
    queryFn: async () => { const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false }); if (error) throw error; return data as Promo[]; },
  });
  const empty = { title: "", body: "", cta_label: "", cta_url: "/planos", image_url: "", ends_at: "" };
  const [f, setF] = useState(empty);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["admin-promos"] }); void qc.invalidateQueries({ queryKey: ["promotions"] }); };
  async function create() {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("promotions").insert({
      title: f.title.trim(), body: f.body.trim() || null, cta_label: f.cta_label.trim() || null, cta_url: f.cta_url.trim() || null,
      image_url: f.image_url.trim() || null, ends_at: f.ends_at ? new Date(`${f.ends_at}T23:59:59`).toISOString() : null, created_by: u.user?.id ?? null,
    });
    if (error) return err(null, t("adminx.promoInvalid"));
    toast.success(t("adminx.promoSaved")); setF(empty); refresh();
  }
  async function setActive(p: Promo, active: boolean) {
    const { error } = await supabase.from("promotions").update({ active }).eq("id", p.id);
    if (error) return err(null, t("adminx.error"));
    refresh();
  }
  async function del(p: Promo) {
    if (!window.confirm(t("adminx.promoDeleteConfirm"))) return;
    const { error } = await supabase.from("promotions").delete().eq("id", p.id);
    if (error) return err(null, t("adminx.error"));
    refresh();
  }
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="font-display font-semibold">{t("adminx.promoNew")}</p>
        <p className="text-sm text-muted-foreground">{t("adminx.promoHint")}</p>
        <Input placeholder={t("adminx.promoTitle")} maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Input placeholder={t("adminx.promoBody")} maxLength={400} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder={t("adminx.promoCta")} maxLength={40} value={f.cta_label} onChange={(e) => setF({ ...f, cta_label: e.target.value })} />
          <Input placeholder={t("adminx.promoUrl")} value={f.cta_url} onChange={(e) => setF({ ...f, cta_url: e.target.value })} />
          <Input placeholder={t("adminx.promoImage")} value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><span className="shrink-0">{t("adminx.promoEnds")}</span><Input type="date" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></label>
        </div>
        <Button disabled={!f.title.trim()} onClick={create}>{t("adminx.promoPublish")}</Button>
      </Card>
      <Card>
        <p className="mb-3 font-display font-semibold">{t("adminx.promoList")}</p>
        <ul className="space-y-3">
          {(list.data ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <div className="min-w-0">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.ends_at ? t("admin.until", { value: new Date(p.ends_at).toLocaleDateString() }) : t("admin.noExpiry")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={p.active} aria-label={t("adminx.promoActive")} onCheckedChange={(v) => setActive(p, v)} />
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(p)}>{t("adminx.delete")}</Button>
              </div>
            </li>
          ))}
          {list.data?.length === 0 && <li className="text-sm text-muted-foreground">{t("admin.none")}</li>}
        </ul>
      </Card>
    </div>
  );
}

export function AdminCoupons() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const load = useServerFn(listCoupons), make = useServerFn(createCoupon), archive = useServerFn(archiveCoupon);
  const list = useQuery({ queryKey: ["admin-coupons"], queryFn: () => load() });
  const empty = { code: "", description: "", percent: "20", usage: "", days: "30", months: "3" };
  const [f, setF] = useState(empty);
  const create = useMutation({
    mutationFn: () => make({ data: {
      code: f.code, description: f.description || f.code, percent: Number(f.percent),
      usage_limit: f.usage ? Number(f.usage) : null, expires_days: f.days !== "0" ? Number(f.days) : null, months: f.months !== "0" ? Number(f.months) : null,
    } }),
    onSuccess: () => { toast.success(t("adminx.couponSaved")); setF(empty); void qc.invalidateQueries({ queryKey: ["admin-coupons"] }); },
    onError: (e) => err(e, t("adminx.error")),
  });
  const off = useMutation({
    mutationFn: (id: string) => archive({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
    onError: (e) => err(e, t("adminx.error")),
  });
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="font-display font-semibold">{t("adminx.couponNew")}</p>
        <p className="text-sm text-muted-foreground">{t("adminx.couponHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder={t("adminx.couponCode")} maxLength={16} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
          <Input placeholder={t("adminx.couponDesc")} maxLength={100} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><span className="shrink-0">{t("adminx.couponPercent")}</span><Input type="number" min={1} max={100} value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><span className="shrink-0">{t("adminx.couponUsage")}</span><Input type="number" min={1} placeholder="∞" value={f.usage} onChange={(e) => setF({ ...f, usage: e.target.value })} /></label>
          <select aria-label={t("adminx.couponValid")} className={sel} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })}>
            <option value="7">{t("adminx.validFor", { value: 7 })}</option><option value="30">{t("adminx.validFor", { value: 30 })}</option><option value="90">{t("adminx.validFor", { value: 90 })}</option><option value="0">{t("admin.noExpiry")}</option>
          </select>
          <select aria-label={t("adminx.couponMonths")} className={sel} value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })}>
            <option value="1">{t("adminx.months", { count: 1 })}</option><option value="3">{t("adminx.months", { count: 3 })}</option><option value="6">{t("adminx.months", { count: 6 })}</option><option value="12">{t("adminx.months", { count: 12 })}</option><option value="0">{t("adminx.forever")}</option>
          </select>
        </div>
        <Button disabled={f.code.length < 3 || create.isPending} onClick={() => create.mutate()}>{create.isPending ? t("shell.saving") : t("adminx.couponCreate")}</Button>
      </Card>
      <Card>
        <p className="mb-3 font-display font-semibold">{t("adminx.couponList")}</p>
        {list.isError && <p className="text-sm text-destructive">{t("adminx.couponLoadError")}</p>}
        <ul className="space-y-3">
          {(list.data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <div className="min-w-0">
                <p className="font-mono font-semibold">{c.code ?? "—"} <span className="font-sans text-sm font-normal">· {c.type === "percentage" ? `${c.amount}%` : c.amount}</span></p>
                <p className="text-xs text-muted-foreground">{c.description} · {t("adminx.used", { value: c.times_used, limit: c.usage_limit ?? "∞" })}{c.expires_at ? ` · ${t("admin.until", { value: new Date(c.expires_at).toLocaleDateString() })}` : ""}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" disabled={off.isPending} onClick={() => off.mutate(c.id)}>{t("adminx.couponArchive")}</Button>
            </li>
          ))}
          {list.data?.length === 0 && <li className="text-sm text-muted-foreground">{t("admin.none")}</li>}
        </ul>
      </Card>
    </div>
  );
}
