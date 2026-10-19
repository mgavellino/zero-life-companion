import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { preferencesSchema } from "./onboarding";

export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => preferencesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { health_consent, ...values } = data;
    const { error } = await context.supabase.from("user_preferences").upsert({
      ...values, user_id: context.userId,
      health_consent_at: health_consent ? new Date().toISOString() : null,
      onboarding_completed_at: new Date().toISOString(), privacy_version: "2026-10-19",
    }, { onConflict: "user_id" });
    if (error) throw new Error("Não foi possível salvar suas preferências.");
    return { ok: true };
  });

export const withdrawHealthConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    for (const table of ["energy_activities", "energy_profiles", "meals"] as const) {
      const { error } = await context.supabase.from(table).delete().eq("user_id", context.userId);
      if (error) throw new Error("Não foi possível apagar os registros de saúde. Tente novamente.");
    }
    const { error } = await context.supabase.from("user_preferences").update({
      health_consent_at: null, weight_kg: null, height_cm: null, age: null, sex: null,
    }).eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível atualizar seu consentimento.");
    return { ok: true };
  });

export const exportPersonalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const result: Record<string, unknown> = {};
    for (const table of ["user_preferences", "threads", "messages", "memories", "tasks", "habits", "habit_checks", "transactions", "budgets", "financial_goals", "meals", "energy_profiles", "energy_activities", "notifications"] as const) {
      const { data, error } = await context.supabase.from(table).select("*").eq("user_id", context.userId);
      if (error) throw new Error("Não foi possível exportar seus dados.");
      result[table] = data;
    }
    const { data, error } = await context.supabase.from("profiles").select("*").eq("id", context.userId);
    if (error) throw new Error("Não foi possível exportar seu perfil.");
    result.profile = data;
    return result;
  });