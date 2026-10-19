import { z } from "zod";

// Never allow an arbitrary URL to become a server-side push destination.
export function isPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") &&
      (url.hostname === "fcm.googleapis.com" || url.hostname === "updates.push.services.mozilla.com" || url.hostname === "web.push.apple.com" || url.hostname.endsWith(".notify.windows.com"));
  } catch { return false; }
}
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(isPushEndpoint),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]+$/).min(80).max(100), auth: z.string().regex(/^[A-Za-z0-9_-]+$/).min(20).max(30) }),
});