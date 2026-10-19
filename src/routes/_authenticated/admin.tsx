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
      const [p, s, r] = await Promise.all([
        supabase.from("profiles").select("id,display_name,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("subscriptions").select("user_id,product_id,price_id,status,current_period_end").eq("environment", env).order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return { users: (p.data ?? []) as Row[], subs: (s.data ?? []) as S[], roles: r.data ?? [] };
    },
  });
  const users = data?.users ?? [];
  const subs = data?.subs ?? [];
  const latest = new Map<string, S>();
  for (const s of subs) if (!latest.has(s.user_id)) latest.set(s.user_id, s);
  const live = [...latest.values()].filter((s) => ["active", "trialing", "past_due"].includes(s.status));
  const admins = new Set((data?.roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
  const filtered = users.filter((u) => !q || (u.display_name ?? "").toLowerCase().includes(q.toLowerCase()) || u.id.startsWith(q));

  async function toggleAdmin(id: string) {
    const res = admins.has(id)
      ? await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin")
      : await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
    if (res.error) return toast.error(res.error.message);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function sendMsg() {
    if (!msg?.title.trim()) return;
    const { error } = await supabase.from("notifications").insert({ user_id: msg.to, title: msg.title, body: msg.body || null, kind: "admin" });
    if (error) return toast.error(error.message);
    toast.success("Notificação enviada");
    setMsg(null);
  }

  return (
    <Page title="Painel admin" kicker={env === "sandbox" ? "Modo teste" : "Ao vivo"}>
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Stat label="Usuários" value={String(users.length)} />
        <Stat label="Assinantes ativos" value={String(live.filter((s) => s.status !== "trialing").length)} />
        <Stat label="Em teste" value={String(live.filter((s) => s.status === "trialing").length)} />
        <Stat label="Receita mensal" value={brl(live.reduce((a, s) => a + mrr(s), 0))} tone="text-money" />
      </div>
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
                    <td>{s ? planFromProduct(s.product_id) : "free"}</td>
                    <td>{s?.status ?? "—"}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="space-x-1 p-4 text-right">
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
