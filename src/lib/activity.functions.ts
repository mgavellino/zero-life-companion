import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const logActivityAuto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ text: z.string().trim().min(3).max(500), date: z.string().date() }).parse(input))
  .handler(async ({ data, context }) => {
    const { estimateAndLogActivity } = await import("./activity.server");
    return estimateAndLogActivity(context.supabase, context.userId, data.text, data.date);
  });