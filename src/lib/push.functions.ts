import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushSubscriptionSchema } from "./push-validation";
import { z } from "zod";

export const getPushPublicKey = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async () => {
  const { getPushKeys } = await import("./push.server");
  return { publicKey: (await getPushKeys()).publicKey };
});
export const registerPushDevice = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => pushSubscriptionSchema.parse(input)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { encryptSecret } = await import("./secret-crypto.server");
  const { data: existing } = await supabaseAdmin.from("push_devices").select("id,user_id").eq("endpoint", data.endpoint).maybeSingle();
  if (existing && existing.user_id !== context.userId) await supabaseAdmin.from("push_devices").delete().eq("id", existing.id);
  const { error } = await supabaseAdmin.from("push_devices").upsert({ user_id: context.userId, endpoint: data.endpoint, subscription_ciphertext: encryptSecret(JSON.stringify(data), "ZERO_PUSH_ENCRYPTION_SECRET") }, { onConflict: "endpoint" });
  if (error) throw new Error("Não foi possível ativar os avisos.");
  return { ok: true };
});
export const disablePushDevice = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => z.object({ endpoint: z.string().max(2048) }).parse(input)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("push_devices").delete().eq("user_id", context.userId).eq("endpoint", data.endpoint);
  if (error) throw new Error("Não foi possível desativar os avisos.");
  return { ok: true };
});
export const testPushDevice = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(input => z.object({ endpoint: z.string().max(2048) }).parse(input)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: device } = await supabaseAdmin.from("push_devices").select("subscription_ciphertext").eq("endpoint", data.endpoint).eq("user_id", context.userId).maybeSingle();
  if (!device) throw new Error("Ative os avisos primeiro.");
  const { sendDevicePush } = await import("./push.server");
  const response = await sendDevicePush(device.subscription_ciphertext, new URL(getRequest().url).origin);
  if (!response.ok) throw new Error("Não foi possível enviar o teste agora.");
  return { ok: true };
});