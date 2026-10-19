import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, Card, Stat } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPaddleEnvironment } from "@/lib/paddle";
import { brl, planFromProduct, PRICES, CYCLE_MONTHS, type Cycle } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Zero" },
      { name: "description", content: "Painel administrativo do Zero." },
      { property: "og:title", content: "Admin — Zero" },
      { property: "og:description", content: "Painel administrativo do Zero." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: (context as { user: { id: string } }).user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/chat" });
  },
  component: Admin,
});

type Row = { id: string; display_name: string | null; created_at: string };
type G = { id: string; user_id: string; plan: string; expires_at: string | null; note: string | null; created_at: string };
type S = { user_id: string; product_id: string; price_id: string; status: string; current_period_end: string | null };

function mrr(s: S) {
  const plan = planFromProduct(s.product_id);
  if (plan === "free" || s.status === "trialing") return 0;
  const cycle = s.price_id.replace(/^[a-z]+_/, "") as Cycle;
  return (PRICES[plan][cycle] ?? 0) / (CYCLE_MONTHS[cycle] ?? 1);
}

function Admin() {
  const qc = useQueryClient();
  const env = getPaddleEnvironment();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ to: string; title: string; body: string } | null>(null);
  const { data } = useQuery({
    queryKey: ["admin", env],
    queryFn: async () => {
      const [p, s, r, g] = await Promise.all([
        supabase.from("profiles").select("id,display_name,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("subscriptions").select("user_id,product_id,price_id,status,current_period_end").eq("environment", env).order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("plan_grants").select("id,user_id,plan,expires_at,note,created_at").is("revoked_at", null).order("created_at", { ascending: false }),
      ]);
      return { users: (p.data ?? []) as Row[], subs: (s.data ?? []) as S[], roles: r.data ?? [], grants: (g.data ?? []) as G[] };
    },
  });
  const users = data?.users ?? [];
  const subs = data?.subs ?? [];
  const latest = new Map<string, S>();
  for (const s of subs) if (!latest.has(s.user_id)) latest.set(s.user_id, s);
  const live = [...latest.values()].filter((s) => ["active", "trialing", "past_due"].includes(s.status));
  const admins = new Set((data?.roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
  const grantOf = new Map<string, G>();
  for (const g of data?.grants ?? []) if (!grantOf.has(g.user_id) && (!g.expires_at || new Date(g.expires_at) > new Date())) grantOf.set(g.user_id, g);
  const [grant, setGrant] = useState<{ to: string; name: string; plan: string; days: string; note: string } | null>(null);
  const [tab, setTab] = useState<"users" | "finance">("users");
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
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("notifications").insert({ user_id: grant.to, title: `Você ganhou o plano ${grant.plan.toUpperCase()}!`, body: days > 0 ? `Válido por ${days} dias.` : "Acesso sem prazo.", kind: "admin" });
    toast.success("Plano concedido");
    setGrant(null);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function revoke(id: string) {
    const { error } = await supabase.from("plan_grants").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plano removido");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  const filtered = users.filter((u) => !q || (u.display_name ?? "").toLowerCase().includes(q.toLowerCase()) || u.id.startsWith(q));

  async function toggleAdmin(id: string) {
    const res = admins.has(id)
      ? await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin")
      : await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    if (res.error) { toast.error(res.error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function sendMsg() {
    if (!msg?.title.trim()) return;
    const { error } = await supabase.from("notifications").insert({ user_id: msg.to, title: msg.title, body: msg.body || null, kind: "admin" });
    if (error) { toast.error(error.message); return; }
    toast.success("Notificação enviada");
    setMsg(null);
  }

  return (
    <Page title="Painel admin" kicker={env === "sandbox" ? "Modo teste" : "Ao vivo"}>
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Stat label="Usuários" value={String(users.length)} />
        <Stat label="Assinantes ativos" value={String(live.filter((s) => s.status !== "trialing").length)} />
        <Stat label="Em teste" value={String(live.filter((s) => s.status === "trialing").length)} />
        <Stat label="Receita mensal" value={brl(totalMrr)} tone="text-money" />
      </div>
      <div className="mb-4 inline-flex rounded-full border bg-card p-0.5 text-sm">
        {([["users", "Usuários"], ["finance", "Financeiro"]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-full px-4 py-1.5 ${tab === v ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
        ))}
      </div>
      {tab === "finance" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Receita anual estimada" value={brl(totalMrr * 12)} tone="text-money" />
            <Stat label="Ticket médio" value={brl(paying.length ? totalMrr / paying.length : 0)} />
            <Stat label="Pagamento atrasado" value={String(pastDue)} tone="text-destructive" />
            <Stat label="Cancelamentos" value={`${canceled} (${churn}%)`} />
          </div>
          <Card>
            <p className="mb-4 font-display font-semibold">Por plano</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Plano</th><th>Pagantes</th><th>Em teste</th><th className="text-right">Receita/mês</th></tr></thead>
              <tbody>
                {byPlan.map((b) => (
                  <tr key={b.pl} className="border-t"><td className="py-2 capitalize">{b.pl}</td><td>{b.n}</td><td>{b.trial}</td><td className="text-right">{brl(b.mrr)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <p className="mb-4 font-display font-semibold">Por ciclo de cobrança</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {byCycle.map((c) => (
                <div key={c.c}><p className="font-display text-2xl font-semibold">{c.n}</p><p className="text-xs text-muted-foreground">{c.c === "monthly" ? "Mensal" : c.c === "semiannual" ? "Semestral" : "Anual"}</p></div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="mb-4 font-display font-semibold">Planos concedidos manualmente ({grantOf.size})</p>
            <ul className="space-y-2 text-sm">
              {[...grantOf.values()].map((g) => (
                <li key={g.id} className="flex items-center justify-between border-t pt-2">
                  <span>{users.find((u) => u.id === g.user_id)?.display_name ?? g.user_id.slice(0, 8)} · <b className="capitalize">{g.plan}</b> {g.expires_at ? `até ${new Date(g.expires_at).toLocaleDateString()}` : "sem prazo"} {g.note && <span className="text-muted-foreground">· {g.note}</span>}</span>
                  <Button size="sm" variant="ghost" onClick={() => revoke(g.id)}>Remover</Button>
                </li>
              ))}
              {!grantOf.size && <li className="text-muted-foreground">Nenhum.</li>}
            </ul>
          </Card>
        </div>
      ) : (
      <Card className="p-0">
        <div className="border-b p-4">
          <Input placeholder="Buscar por nome ou ID" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-4">Usuário</th><th>Plano</th><th>Status</th><th>Desde</th><th className="p-4 text-right">Ações</th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const s = latest.get(u.id);
                return (
                  <tr key={u.id} className="border-t">
                    <td className="p-4">
                      <p className="font-medium">{u.display_name ?? "Sem nome"} {admins.has(u.id) && <span className="ml-1 rounded bg-signal px-1.5 text-[10px] font-bold text-signal-foreground">ADMIN</span>}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{u.id}</p>
                    </td>
                    <td className="capitalize">
                      {s && ["active", "trialing", "past_due"].includes(s.status) ? planFromProduct(s.product_id) : "free"}
                      {grantOf.get(u.id) && <span className="ml-1 rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">+{grantOf.get(u.id)!.plan}</span>}
                    </td>
                    <td>{s?.status ?? "—"}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="space-x-1 p-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setGrant({ to: u.id, name: u.display_name ?? "usuário", plan: "pro", days: "30", note: "" })}>Dar plano</Button>
                      {grantOf.get(u.id) && <Button size="sm" variant="ghost" onClick={() => revoke(grantOf.get(u.id)!.id)}>Tirar plano</Button>}
                      <Button size="sm" variant="ghost" onClick={() => setMsg({ to: u.id, title: "", body: "" })}>Notificar</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u.id)}>{admins.has(u.id) ? "Remover admin" : "Tornar admin"}</Button>
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
          <p className="font-display font-semibold">Dar plano para {grant.name}</p>
          <div className="flex flex-wrap gap-2">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={grant.plan} onChange={(e) => setGrant({ ...grant, plan: e.target.value })}>
              <option value="essencial">Essencial</option><option value="pro">Pro</option><option value="max">Max</option>
            </select>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })}>
              <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option><option value="0">Sem prazo</option>
            </select>
            <Input className="max-w-xs" placeholder="Motivo (opcional)" value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveGrant}>Conceder</Button>
            <Button variant="ghost" onClick={() => setGrant(null)}>Cancelar</Button>
          </div>
        </Card>
      )}
      {msg && (
        <Card className="mt-6 space-y-3">
          <p className="font-display font-semibold">Enviar notificação</p>
          <Input placeholder="Título" value={msg.title} onChange={(e) => setMsg({ ...msg, title: e.target.value })} />
          <Input placeholder="Mensagem (opcional)" value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={sendMsg}>Enviar</Button>
            <Button variant="ghost" onClick={() => setMsg(null)}>Cancelar</Button>
          </div>
        </Card>
      )}
    </Page>
  );
}
