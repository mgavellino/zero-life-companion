import { buildPushPayload } from "@block65/webcrypto-web-push";
import { decryptSecret, encryptSecret } from "./secret-crypto.server";
import { isPushEndpoint } from "./push-validation";

const ENCRYPTION_KEY = "ZERO_PUSH_ENCRYPTION_SECRET";
export async function getPushKeys() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("push_configuration").select("public_key,private_key_ciphertext").eq("id", "vapid").maybeSingle();
  if (error) throw new Error("Não foi possível preparar os avisos.");
  if (data) return { publicKey: data.public_key, privateKey: decryptSecret(data.private_key_ciphertext, ENCRYPTION_KEY) };
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  if (!jwk.d) throw new Error("Não foi possível preparar os avisos.");
  const publicKey = Buffer.from(raw).toString("base64url");
  const saved = await supabaseAdmin.from("push_configuration").upsert({ id: "vapid", public_key: publicKey, private_key_ciphertext: encryptSecret(jwk.d, ENCRYPTION_KEY) }, { onConflict: "id", ignoreDuplicates: true });
  if (saved.error) throw new Error("Não foi possível preparar os avisos.");
  // Read the winning insert when two devices initialize concurrently.
  return getPushKeys();
}

export async function sendDevicePush(subscriptionCiphertext: string, origin: string) {
  const subscription = JSON.parse(decryptSecret(subscriptionCiphertext, ENCRYPTION_KEY));
  if (!isPushEndpoint(subscription.endpoint)) throw new Error("Destino inválido.");
  const keys = await getPushKeys();
  const payload = await buildPushPayload({ data: JSON.stringify({ title: "Zero", body: "Você tem um novo aviso. Abra o Zero para conferir.", path: "/chat" }), options: { ttl: 3600 } }, subscription, { ...keys, subject: origin });
  return fetch(subscription.endpoint, { ...payload, redirect: "error" });
}

export async function dispatchPendingPush(origin: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: notices, error } = await supabaseAdmin.from("notifications").select("id,user_id,created_at").is("read_at", null).gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString()).order("created_at", { ascending: true }).limit(100);
  if (error) throw new Error("Falha no envio.");
  let sent = 0;
  for (const n of notices ?? []) {
    const { data: devices } = await supabaseAdmin.from("push_devices").select("id,subscription_ciphertext,created_at").eq("user_id", n.user_id).lte("created_at", n.created_at);
    for (const device of devices ?? []) {
      await supabaseAdmin.from("push_deliveries").upsert({ notification_id: n.id, device_id: device.id }, { onConflict: "notification_id,device_id", ignoreDuplicates: true });
      const { data: delivery } = await supabaseAdmin.from("push_deliveries").select("id,attempts").eq("notification_id", n.id).eq("device_id", device.id).is("delivered_at", null).lte("next_attempt_at", new Date().toISOString()).maybeSingle();
      if (!delivery || delivery.attempts >= 5) continue;
      // Claim before sending so concurrent scheduled requests do not double-send.
      const { data: claimed } = await supabaseAdmin.from("push_deliveries").update({ attempts: delivery.attempts + 1, next_attempt_at: new Date(Date.now() + 3600_000).toISOString() }).eq("id", delivery.id).eq("attempts", delivery.attempts).select("id").maybeSingle();
      if (!claimed) continue;
      try {
        const response = await sendDevicePush(device.subscription_ciphertext, origin);
        if (response.ok) { await supabaseAdmin.from("push_deliveries").update({ delivered_at: new Date().toISOString() }).eq("id", delivery.id); sent++; }
        else if (response.status === 404 || response.status === 410) await supabaseAdmin.from("push_devices").delete().eq("id", device.id);
        else if (response.status < 500 && response.status !== 429) await supabaseAdmin.from("push_deliveries").update({ attempts: 5 }).eq("id", delivery.id);
        if (!response.ok) console.error("Push delivery status", response.status);
      } catch { console.error("Push delivery temporarily unavailable"); }
    }
  }
  return sent;
}