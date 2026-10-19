import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { startTimeSchema } from "./time-tracking";

export const getTimeSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("time_sessions").select("id,category,started_at,ended_at").eq("user_id", context.userId).order("started_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar seu tempo.");
    return data;
  });

export const startTimeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => startTimeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("time_sessions").insert({ user_id: context.userId, category: data.category, started_at: new Date().toISOString() });
    if (error) throw new Error("Não foi possível iniciar. Confira se há um relógio em andamento.");
    return { ok: true };
  });

export const stopTimeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: stopped, error } = await context.supabase.from("time_sessions").update({ ended_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).is("ended_at", null).select("id").maybeSingle();
    if (error || !stopped) throw new Error("Não foi possível encerrar esse registro.");
    return { ok: true };
  });