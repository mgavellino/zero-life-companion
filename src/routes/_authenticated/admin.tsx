import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, Card, Stat } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPaddleEnvironment } from "@/lib/paddle";
import { useServerFn } from "@tanstack/react-start";
import { listAllUsers, setUserBlocked, deleteUserAccount } from "@/lib/admin.functions";
import { AdminBroadcast, AdminPromotions, AdminCoupons } from "@/components/AdminTools";
import { brl, planFromProduct, PRICES, CYCLE_MONTHS, type Cycle } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: i18n.t("admin.metaTitle") },
      { name: "description", content: i18n.t("admin.metaDescription") },
      { property: "og:title", content: i18n.t("admin.metaTitle") },
      { property: "og:description", content: i18n.t("admin.metaDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: (context as { user: { id: string } }).user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: Admin,
});

type Row = { id: string; display_name: string | null; created_at: string };
type G = { id: string; user_id: string; plan: string; expires_at: string | null; note: string | null; created_at: string; is_trial?: boolean };
type S = { user_id: string; product_id: string; price_id: string; status: string; current_period_end: string | null };

function mrr(s: S) {
  const plan = planFromProduct(s.product_id);
  if (plan === "free" || s.status === "trialing") return 0;
  const cycle = s.price_id.replace(/^[a-z]+_/, "") as Cycle;
  return (PRICES[plan][cycle] ?? 0) / (CYCLE_MONTHS[cycle] ?? 1);
}

function Admin() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const env = getPaddleEnvironment();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ to: string; title: string; body: string } | null>(null);
  const { data } = useQuery({
    queryKey: ["admin", env],
    queryFn: async () => {
      const [p, s, r, g] = await Promise.all([
        supabase.from("subscriptions").select("user_id,created_at").eq("environment", env).order("created_at", { ascending: false }).limit(500),
        supabase.from("subscriptions").select("user_id,product_id,price_id,status,current_period_end").eq("environment", env).order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        (supabase.from("plan_grants") as any).select("id,user_id,plan,expires_at,note,created_at,is_trial" as never).is("revoked_at", null).order("created_at", { ascending: false }),
      ]);
      const accounts = new Map<string, Row>();
      for (const row of p.data ?? []) accounts.set(row.user_id, { id: row.user_id, display_name: null, created_at: row.created_at ?? "" });
      for (const row of g.data ?? []) if (!accounts.has(row.user_id)) accounts.set(row.user_id, { id: row.user_id, display_name: null, created_at: row.created_at });
      for (const row of r.data ?? []) if (!accounts.has(row.user_id)) accounts.set(row.user_id, { id: row.user_id, display_name: null, created_at: "" });
      return { users: [...accounts.values()], subs: (s.data ?? []) as S[], roles: r.data ?? [], grants: (g.data ?? []) as unknown as G[] };
    },
  });
  const loadUsers = useServerFn(listAllUsers), block = useServerFn(setUserBlocked), remove = useServerFn(deleteUserAccount);
  const all = useQuery({ queryKey: ["admin-users"], queryFn: () => loadUsers() });
  const users = all.data ?? [];
  const subs = data?.subs ?? [];
  const latest = new Map<string, S>();
  for (const s of subs) if (!latest.has(s.user_id)) latest.set(s.user_id, s);
  const live = [...latest.values()].filter((s) => ["active", "trialing", "past_due"].includes(s.status));
  const admins = new Set((data?.roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
  const grantOf = new Map<string, G>();
  for (const g of data?.grants ?? []) if (!grantOf.has(g.user_id) && (!g.expires_at || new Date(g.expires_at) > new Date())) grantOf.set(g.user_id, g);
  const [grant, setGrant] = useState<{ to: string; name: string; plan: string; days: string; note: string; trial?: boolean } | null>(null);
  const [tab, setTab] = useState<"users" | "finance" | "broadcast" | "promos" | "coupons">("users");
  const paying = live.filter((s) => s.status !== "trialing");
  const totalMrr = live.reduce((a, s) => a + mrr(s), 0);
  const byPlan = (["essencial", "pro", "max"] as const).map((pl) => {
    const list = paying.filter((s) => planFromProduct(s.product_id) === pl);
    return { pl, n: list.length, mrr: list.reduce((a, s) => a + mrr(s), 0), trial: live.filter((s) => s.status === "trialing" && planFromProduct(s.product_id) === pl).length };
  });
  const byCycle = (["monthly", "semiannual", "yearly"] as const).map((c) => ({ c, n: paying.filter((s) => s.price_id.endsWith(c)).length }));
  const canceled = [...latest.values()].filter((s) => s.status === "canceled").length;
  const pastDue = live.filter((s) => s.status === "past_due").length;
  const churn = latest.size ? Math.round((canceled / latest.size) * 100) : 0;

  async function saveGrant() {
    if (!grant) return;
    const days = Number(grant.days);
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("plan_grants").insert({
      user_id: grant.to,
      plan: grant.plan,
      expires_at: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
      note: grant.note || null,
      granted_by: me.user?.id ?? null,
      is_trial: !!grant.trial,
    } as never);
    if (error) { toast.error(error.message); return; }
    await supabase.from("notifications").insert({ user_id: grant.to, title: t(grant.trial ? "admin.trialGiftTitle" : "admin.giftTitle", { value: grant.plan.toUpperCase() }), body: days > 0 ? t("admin.validDays", { value: days }) : t("admin.unlimitedAccess"), kind: "admin" });
    toast.success(t("admin.granted"));
    setGrant(null);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function revoke(id: string) {
    const { error } = await supabase.from("plan_grants").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("admin.revoked"));
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  const [planFilter, setPlanFilter] = useState("all");
  const filtered = users.filter((u) => (planFilter === "all" || u.plan === planFilter) && (!q || (u.display_name ?? "").toLowerCase().includes(q.toLowerCase()) || (u.email ?? "").toLowerCase().includes(q.toLowerCase()) || u.id.startsWith(q)));
  const newWeek = users.filter((u) => Date.now() - new Date(u.created_at).getTime() < 7 * 86400000).length;
  const activeWeek = users.filter((u) => u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() < 7 * 86400000).length;

  async function toggleBlock(id: string, blocked: boolean) {
    try { await block({ data: { userId: id, blocked } }); toast.success(t(blocked ? "adminx.blocked" : "adminx.unblocked")); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : t("adminx.error")); }
  }
  async function removeUser(id: string, label: string) {
    if (!window.confirm(t("adminx.deleteConfirm", { value: label }))) return;
    try { await remove({ data: { userId: id } }); toast.success(t("adminx.deleted")); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : t("adminx.error")); }
  }

  async function toggleAdmin(id: string) {
    const res = users.find((u) => u.id === id)?.admin
      ? await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin")
      : await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    if (res.error) { toast.error(res.error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["is-admin"] });
  }

  async function sendMsg() {
    if (!msg?.title.trim()) return;
    const { error } = await supabase.from("notifications").insert({ user_id: msg.to, title: msg.title, body: msg.body || null, kind: "admin" });
    if (error) { toast.error(error.message); return; }
    toast.success(t("admin.sent"));
    setMsg(null);
  }

  return (
    <Page title={t("admin.title")} kicker={env === "sandbox" ? t("admin.sandbox") : t("admin.live")}>
      <div className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("admin.users")} value={String(users.length)} />
        <Stat label={t("admin.active")} value={String(live.filter((s) => s.status !== "trialing").length)} />
        <Stat label={t("adminx.newWeek")} value={String(newWeek)} />
        <Stat label={t("adminx.activeWeek")} value={String(activeWeek)} />
        <Stat label={t("admin.trial")} value={String(live.filter((s) => s.status === "trialing").length)} />
        <Stat label={t("admin.monthlyRevenue")} value={brl(totalMrr)} tone="text-money" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-2xl border bg-card p-1 text-sm">
        {([["users", t("admin.users")], ["finance", t("admin.finance")], ["broadcast", t("adminx.broadcast")], ["promos", t("adminx.promos")], ["coupons", t("adminx.coupons")]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-full px-4 py-1.5 ${tab === v ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
        ))}
      </div>
      {tab === "broadcast" ? <AdminBroadcast /> : tab === "promos" ? <AdminPromotions /> : tab === "coupons" ? <AdminCoupons /> : tab === "finance" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label={t("admin.annualRevenue")} value={brl(totalMrr * 12)} tone="text-money" />
            <Stat label={t("admin.average")} value={brl(paying.length ? totalMrr / paying.length : 0)} />
            <Stat label={t("admin.overdue")} value={String(pastDue)} tone="text-destructive" />
            <Stat label={t("admin.cancellations")} value={`${canceled} (${churn}%)`} />
          </div>
          <Card>
            <p className="mb-4 font-display font-semibold">{t("admin.byPlan")}</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">{t("admin.plan")}</th><th>{t("admin.paying")}</th><th>{t("admin.trial")}</th><th className="text-right">{t("admin.revenuePerMonth")}</th></tr></thead>
              <tbody>
                {byPlan.map((b) => (
                  <tr key={b.pl} className="border-t"><td className="py-2 capitalize">{b.pl}</td><td>{b.n}</td><td>{b.trial}</td><td className="text-right">{brl(b.mrr)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <p className="mb-4 font-display font-semibold">{t("admin.byCycle")}</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {byCycle.map((c) => (
                <div key={c.c}><p className="font-display text-2xl font-semibold">{c.n}</p><p className="text-xs text-muted-foreground">{c.c === "monthly" ? t("pricing.monthly") : c.c === "semiannual" ? t("pricing.semiannual") : t("pricing.yearly")}</p></div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="mb-4 font-display font-semibold">{t("admin.grants", { value: grantOf.size })}</p>
            <ul className="space-y-2 text-sm">
              {[...grantOf.values()].map((g) => (
                <li key={g.id} className="flex items-center justify-between border-t pt-2">
                  <span>{users.find((u) => u.id === g.user_id)?.display_name ?? g.user_id.slice(0, 8)} · <b className="capitalize">{g.plan}</b> {g.expires_at ? t("admin.until", { value: new Date(g.expires_at).toLocaleDateString() }) : t("admin.noExpiry")} {g.note && <span className="text-muted-foreground">· {g.note}</span>}</span>
                  <Button size="sm" variant="ghost" onClick={() => revoke(g.id)}>{t("admin.remove")}</Button>
                </li>
              ))}
              {!grantOf.size && <li className="text-muted-foreground">{t("admin.none")}</li>}
            </ul>
          </Card>
        </div>
      ) : (
      <Card className="p-0">
        <div className="border-b p-4">
          <div className="flex flex-wrap gap-2">
            <Input placeholder={t("adminx.searchEmail")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
            <select aria-label={t("admin.plan")} className="h-9 rounded-md border bg-background px-2 text-sm" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
              <option value="all">{t("adminx.allPlans")}</option><option value="free">{t("pricing.freeName")}</option><option value="essencial">Essencial</option><option value="pro">Pro</option><option value="max">Max</option>
            </select>
          </div>
          {all.isError && <p className="mt-2 text-sm text-destructive">{t("adminx.loadError")}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-4">{t("admin.user")}</th><th>{t("admin.plan")}</th><th>{t("admin.status")}</th><th>{t("admin.since")}</th><th className="p-4 text-right">{t("admin.actions")}</th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const s = latest.get(u.id);
                return (
                  <tr key={u.id} className="border-t">
                    <td className="p-4">
                      <p className="font-medium">{u.display_name ?? t("admin.unnamed")} {u.banned && <span className="ml-1 rounded bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{t("adminx.blockedBadge")}</span>} {!u.onboarded && <span className="ml-1 rounded bg-muted px-1.5 text-[10px]">{t("adminx.noOnboarding")}</span>} {u.admin && <span className="ml-1 rounded bg-signal px-1.5 text-[10px] font-bold text-signal-foreground">{t("admin.badge")}</span>}</p>
                      <p className="text-xs text-muted-foreground">{u.email ?? "—"}{u.providers.length ? ` · ${u.providers.join(", ")}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">{t("adminx.lastSeen")}: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}</p>
                    </td>
                    <td className="capitalize">
                      {u.plan === "free" ? t("pricing.freeName") : u.plan}
                      {grantOf.get(u.id) && <span className="ml-1 rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">+{grantOf.get(u.id)?.plan}{grantOf.get(u.id)?.is_trial ? ` · ${t("admin.grantTrial")}` : ""}</span>}
                    </td>
                    <td>{s?.status ? t(`admin.statuses.${s.status}`, { defaultValue: s.status }) : "—"}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="space-x-1 p-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setGrant({ to: u.id, name: u.display_name ?? t("admin.userFallback"), plan: "pro", days: "30", note: "" })}>{t("admin.give")}</Button>
                      {grantOf.get(u.id) && <Button size="sm" variant="ghost" onClick={() => { const activeGrant = grantOf.get(u.id); if (activeGrant) void revoke(activeGrant.id); }}>{t("admin.take")}</Button>}
                      <Button size="sm" variant="ghost" onClick={() => setMsg({ to: u.id, title: "", body: "" })}>{t("admin.notify")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u.id)}>{u.admin ? t("admin.removeAdmin") : t("admin.makeAdmin")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleBlock(u.id, !u.banned)}>{u.banned ? t("adminx.unblock") : t("adminx.block")}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeUser(u.id, u.email ?? u.id)}>{t("adminx.delete")}</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      )}
      {grant && (
        <Card className="mt-6 space-y-3">
          <p className="font-display font-semibold">{t("admin.giveTo", { value: grant.name })}</p>
          <div className="flex flex-wrap gap-2">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={grant.plan} onChange={(e) => setGrant({ ...grant, plan: e.target.value })}>
              <option value="essencial">Essencial</option><option value="pro">Pro</option><option value="max">Max</option>
            </select>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })}>
              <option value="7">{t("admin.days", { value: 7 })}</option><option value="30">{t("admin.days", { value: 30 })}</option><option value="90">{t("admin.days", { value: 90 })}</option><option value="365">{t("admin.year")}</option><option value="0">{t("admin.noExpiry")}</option>
            </select>
            <select aria-label="Tipo" className="h-9 rounded-md border bg-background px-2 text-sm" value={grant.trial ? "trial" : "full"} onChange={(e) => setGrant({ ...grant, trial: e.target.value === "trial" })}>
              <option value="full">{t("admin.grantFull")}</option><option value="trial">{t("admin.grantTrial")}</option>
            </select>
            <Input className="max-w-xs" placeholder={t("admin.reason")} value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveGrant}>{t("admin.grant")}</Button>
            <Button variant="ghost" onClick={() => setGrant(null)}>{t("admin.cancel")}</Button>
          </div>
        </Card>
      )}
      {msg && (
        <Card className="mt-6 space-y-3">
          <p className="font-display font-semibold">{t("admin.sendNotification")}</p>
          <Input placeholder={t("admin.notificationTitle")} value={msg.title} onChange={(e) => setMsg({ ...msg, title: e.target.value })} />
          <Input placeholder={t("admin.message")} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={sendMsg}>{t("admin.send")}</Button>
            <Button variant="ghost" onClick={() => setMsg(null)}>{t("admin.cancel")}</Button>
          </div>
        </Card>
      )}
    </Page>
  );
}
