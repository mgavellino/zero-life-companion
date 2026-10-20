import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { highestPlan, planFromProduct, type PlanId } from "@/lib/plans";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };

/** Verifies the caller is an admin with their own RLS client before any privileged work. */
async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function paddleEnv() {
  const { serverPaddleEnv } = await import("@/lib/paddle.server");
  return serverPaddleEnv();
}

/** Every account with its effective plan, used by the admin user list. */
export const listAllUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const sb = await admin();
    const env = await paddleEnv();
    const users: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null; banned: boolean; providers: string[] }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("Não foi possível carregar as contas.");
      for (const u of data.users) users.push({
        id: u.id, email: u.email ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null,
        banned: !!(u as { banned_until?: string | null }).banned_until && new Date((u as { banned_until: string }).banned_until) > new Date(),
        providers: (u.identities ?? []).map((i) => i.provider),
      });
      if (data.users.length < 1000) break;
    }
    const [prefs, subs, grants, roles] = await Promise.all([
      sb.from("user_preferences").select("user_id,display_name,onboarding_completed_at"),
      sb.from("subscriptions").select("user_id,product_id,status,current_period_end,created_at").eq("environment", env).order("created_at", { ascending: false }),
      sb.from("plan_grants").select("user_id,plan,expires_at").is("revoked_at", null),
      sb.from("user_roles").select("user_id,role"),
    ]);
    const name = new Map((prefs.data ?? []).map((p) => [p.user_id, p]));
    const sub = new Map<string, { product_id: string; status: string; current_period_end: string | null }>();
    for (const s of subs.data ?? []) if (!sub.has(s.user_id)) sub.set(s.user_id, s);
    const now = new Date();
    return users.map((u) => {
      const s = sub.get(u.id);
      const live = s && ["active", "trialing", "past_due", "canceled"].includes(s.status) && (!s.current_period_end || new Date(s.current_period_end) > now);
      const granted = (grants.data ?? []).filter((g) => g.user_id === u.id && (!g.expires_at || new Date(g.expires_at) > now)).map((g) => g.plan as PlanId);
      return {
        ...u,
        display_name: name.get(u.id)?.display_name ?? null,
        onboarded: !!name.get(u.id)?.onboarding_completed_at,
        plan: highestPlan(live ? planFromProduct(s.product_id) : "free", ...granted),
        sub_status: s?.status ?? null,
        admin: (roles.data ?? []).some((r) => r.user_id === u.id && r.role === "admin"),
      };
    });
  });

export const setUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.userId === context.userId) throw new Error("Você não pode bloquear a própria conta.");
    const { error } = await (await admin()).auth.admin.updateUserById(data.userId, { ban_duration: data.blocked ? "876000h" : "none" });
    if (error) throw new Error("Não foi possível atualizar a conta.");
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a própria conta por aqui.");
    const sb = await admin();
    // App tables hold plain user ids (no FK cascade), so remove the person's rows first.
    const tables = ["messages", "threads", "memories", "tasks", "habit_checks", "habits", "bill_payments", "recurring_bills", "transactions", "budgets", "financial_goals", "meals", "energy_activities", "energy_profiles", "notifications", "time_sessions", "user_preferences", "plan_grants", "mcp_tool_blocks", "workout_exercises", "workouts", "push_devices", "app_user_connections", "calendar_oauth_attempts"] as const;
    for (const t of tables) await sb.from(t).delete().eq("user_id", data.userId);
    const { error } = await sb.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Não foi possível excluir a conta.");
    return { ok: true };
  });

export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    audience: z.enum(["all", "free", "paid", "essencial", "pro", "max"]),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().max(400).optional(),
    link: z.string().regex(/^\/[^/\\]/).max(200).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const all = await listAllUsersInternal();
    const targets = all.filter((u) => !u.banned && (data.audience === "all" || (data.audience === "free" ? u.plan === "free" : data.audience === "paid" ? u.plan !== "free" : u.plan === data.audience)));
    const sb = await admin();
    for (let i = 0; i < targets.length; i += 500) {
      const { error } = await sb.from("notifications").insert(targets.slice(i, i + 500).map((u) => ({ user_id: u.id, title: data.title, body: data.body || null, link: data.link || null, kind: "admin" })));
      if (error) throw new Error("Não foi possível enviar o aviso.");
    }
    return { sent: targets.length };
  });

async function listAllUsersInternal() {
  const sb = await admin();
  const env = await paddleEnv();
  const ids: { id: string; banned: boolean }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Não foi possível carregar as contas.");
    for (const u of data.users) { const b = (u as { banned_until?: string | null }).banned_until; ids.push({ id: u.id, banned: !!b && new Date(b) > new Date() }); }
    if (data.users.length < 1000) break;
  }
  const [subs, grants] = await Promise.all([
    sb.from("subscriptions").select("user_id,product_id,status,current_period_end,created_at").eq("environment", env).order("created_at", { ascending: false }),
    sb.from("plan_grants").select("user_id,plan,expires_at").is("revoked_at", null),
  ]);
  const sub = new Map<string, { product_id: string; status: string; current_period_end: string | null }>();
  for (const s of subs.data ?? []) if (!sub.has(s.user_id)) sub.set(s.user_id, s);
  const now = new Date();
  return ids.map((u) => {
    const s = sub.get(u.id);
    const live = s && ["active", "trialing", "past_due", "canceled"].includes(s.status) && (!s.current_period_end || new Date(s.current_period_end) > now);
    const granted = (grants.data ?? []).filter((g) => g.user_id === u.id && (!g.expires_at || new Date(g.expires_at) > now)).map((g) => g.plan as PlanId);
    return { ...u, plan: highestPlan(live ? planFromProduct(s.product_id) : "free", ...granted) };
  });
}

// ---------- Coupons (payment-provider discounts) ----------

type Discount = { id: string; code: string | null; description: string; type: string; amount: string; status: string; usage_limit: number | null; times_used: number; expires_at: string | null; recur: boolean; maximum_recurring_intervals: number | null };

export const listCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { gatewayFetch } = await import("@/lib/paddle.server");
    const res = await gatewayFetch(await paddleEnv(), "/discounts?status=active&per_page=100&order_by=created_at[DESC]");
    if (!res.ok) throw new Error("Não foi possível carregar os cupons.");
    const json = (await res.json()) as { data: Discount[] };
    return json.data.map((d) => ({ id: d.id, code: d.code, description: d.description, type: d.type, amount: d.amount, usage_limit: d.usage_limit, times_used: d.times_used, expires_at: d.expires_at, recur: d.recur, months: d.maximum_recurring_intervals }));
  });

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,16}$/),
    description: z.string().trim().min(1).max(100),
    percent: z.number().int().min(1).max(100),
    usage_limit: z.number().int().min(1).max(100000).nullable(),
    expires_days: z.number().int().min(1).max(3650).nullable(),
    months: z.number().int().min(1).max(36).nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { gatewayFetch } = await import("@/lib/paddle.server");
    const res = await gatewayFetch(await paddleEnv(), "/discounts", {
      method: "POST",
      body: JSON.stringify({
        type: "percentage", amount: String(data.percent), description: data.description, code: data.code,
        enabled_for_checkout: true, recur: true, maximum_recurring_intervals: data.months,
        usage_limit: data.usage_limit,
        expires_at: data.expires_days ? new Date(Date.now() + data.expires_days * 86400000).toISOString() : null,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("coupon create failed", res.status, body);
      throw new Error(body.includes("code") && res.status === 400 ? "Esse código já existe ou é inválido." : "Não foi possível criar o cupom.");
    }
    return { ok: true };
  });

export const archiveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().regex(/^dsc_[a-z0-9]+$/) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { gatewayFetch } = await import("@/lib/paddle.server");
    const res = await gatewayFetch(await paddleEnv(), `/discounts/${data.id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) });
    if (!res.ok) throw new Error("Não foi possível desativar o cupom.");
    return { ok: true };
  });
