// @vitest-environment node
/**
 * Live isolation check against the real backend: two throwaway accounts are created,
 * account A saves chat, tasks, time, money and diet data, and account B (plus a signed-out
 * visitor) must not be able to read, change, delete or write into any of it.
 * Skips automatically when server credentials are not available.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const enabled = !!(url && serviceKey && anonKey);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

type Row = { table: string; id: string };
let admin: SupabaseClient, a: SupabaseClient, b: SupabaseClient, anon: SupabaseClient;
let userA = "", userB = "";
const owned: Row[] = [];
let threadA = "";

async function makeUser(tag: string) {
  const email = `isolation-${tag}-${crypto.randomUUID()}@example.com`;
  const password = `Pw-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(url!, anonKey!, opts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

describe.skipIf(!enabled)("account isolation", () => {
  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, opts);
    anon = createClient(url!, anonKey!, opts);
    const ua = await makeUser("a"), ub = await makeUser("b");
    userA = ua.id; a = ua.client; userB = ub.id; b = ub.client;
    const today = new Date().toISOString().slice(0, 10);
    const inserts: [string, Record<string, unknown>][] = [
      ["threads", { user_id: userA, title: "Privado A" }],
      ["tasks", { user_id: userA, title: "Tarefa privada A", priority: "medium" }],
      ["time_sessions", { user_id: userA, category: "work", started_at: new Date(Date.now() - 3600_000).toISOString(), ended_at: new Date().toISOString() }],
      ["transactions", { user_id: userA, kind: "expense", amount: 42, category: "Outros", occurred_on: today }],
      ["meals", { user_id: userA, name: "Almoço A", meal_type: "lunch", calories: 500, protein: 30, carbs: 50, fat: 15, eaten_on: today }],
      ["memories", { user_id: userA, content: "Segredo da conta A" }],
    ];
    for (const [table, row] of inserts) {
      const { data, error } = await a.from(table).insert(row).select("id").single();
      if (error) throw new Error(`${table}: ${error.message}`);
      owned.push({ table, id: data.id });
      if (table === "threads") threadA = data.id;
    }
    const { data: msg, error } = await a.from("messages").insert({ user_id: userA, thread_id: threadA, role: "user", parts: [{ type: "text", text: "oi" }] }).select("id").single();
    if (error) throw new Error(`messages: ${error.message}`);
    owned.push({ table: "messages", id: msg.id });
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    for (const table of ["messages", "threads", "tasks", "time_sessions", "transactions", "meals", "memories"]) {
      for (const id of [userA, userB].filter(Boolean)) await admin.from(table).delete().eq("user_id", id);
    }
    for (const id of [userA, userB].filter(Boolean)) await admin.auth.admin.deleteUser(id);
  }, 60_000);

  it("owner can read their own data", async () => {
    for (const { table, id } of owned) {
      const { data } = await a.from(table).select("id").eq("id", id);
      expect(data, table).toHaveLength(1);
    }
  });

  it("another account cannot read chats, tasks, time, money or diet", async () => {
    for (const { table, id } of owned) {
      const { data } = await b.from(table).select("*").eq("id", id);
      expect(data ?? [], table).toHaveLength(0);
      const { data: all } = await b.from(table).select("user_id").eq("user_id", userA);
      expect(all ?? [], table).toHaveLength(0);
    }
  });

  it("a signed-out visitor cannot read any of it", async () => {
    for (const { table, id } of owned) {
      const { data } = await anon.from(table).select("id").eq("id", id);
      expect(data ?? [], table).toHaveLength(0);
    }
  });

  it("another account cannot change or delete the data", async () => {
    for (const { table, id } of owned) {
      const { data: updated } = await b.from(table).update({ user_id: userB }).eq("id", id).select("id");
      expect(updated ?? [], table).toHaveLength(0);
      const { data: deleted } = await b.from(table).delete().eq("id", id).select("id");
      expect(deleted ?? [], table).toHaveLength(0);
      const { data: still } = await admin.from(table).select("user_id").eq("id", id).single();
      expect(still?.user_id, table).toBe(userA);
    }
  });

  it("another account cannot write records in someone else's name or chat", async () => {
    const { error: taskError } = await b.from("tasks").insert({ user_id: userA, title: "intrusa", priority: "medium" });
    expect(taskError).not.toBeNull();
    const { error: msgError } = await b.from("messages").insert({ user_id: userB, thread_id: threadA, role: "user", parts: [] });
    expect(msgError).not.toBeNull();
  });
});
