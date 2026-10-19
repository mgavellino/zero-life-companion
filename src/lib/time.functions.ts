import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DAY_MINUTES, logTimeSchema } from "./time-tracking";

export const getTimeSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("time_sessions").select("id,category,started_at,ended_at").eq("user_id", context.userId).order("started_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar seu tempo.");
    return data;
  });

/** Records "I spent N minutes on <category>" for a day; entries are stacked inside that day so they never overlap. */
export const logTimeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => logTimeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const dayStart = Date.parse(data.dayStart);
    const dayEnd = dayStart + DAY_MINUTES * 60_000;
    const { data: rows, error } = await context.supabase.from("time_sessions").select("started_at,ended_at").eq("user_id", context.userId).gte("started_at", new Date(dayStart).toISOString()).lt("started_at", new Date(dayEnd).toISOString());
    if (error) throw new Error("Não foi possível salvar.");
    const cursor = (rows ?? []).reduce((max, r) => Math.max(max, r.ended_at ? Date.parse(r.ended_at) : Date.now()), dayStart);
    const end = cursor + data.minutes * 60_000;
    if (end > dayEnd) throw new Error("DAY_FULL");
    const { error: insertError } = await context.supabase.from("time_sessions").insert({ user_id: context.userId, category: data.category, started_at: new Date(cursor).toISOString(), ended_at: new Date(end).toISOString() });
    if (insertError) throw new Error("Não foi possível salvar.");
    return { ok: true };
  });

export const deleteTimeEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("time_sessions").delete().in("id", data.ids).eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível remover.");
    return { ok: true };
  });
