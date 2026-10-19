import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gatewayFetch, getPaddleClient, type PaddleEnv } from "@/lib/paddle.server";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: PaddleEnv }) => {
    if (!/^[a-z_]{3,40}$/.test(data.priceId)) throw new Error("Invalid price");
    return { priceId: data.priceId, environment: data.environment === "live" ? "live" : "sandbox" } as const;
  })
  .handler(async ({ data }) => {
    const response = await gatewayFetch(data.environment, `/prices?external_id=${encodeURIComponent(data.priceId)}`);
    if (!response.ok) throw new Error(`Price lookup failed [${response.status}]: ${await response.text()}`);
    const result = await response.json();
    if (!result.data?.length) throw new Error("Price not found");
    return result.data[0].id as string;
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) => ({ environment: data.environment === "live" ? "live" : "sandbox" }) as const)
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("paddle_customer_id,paddle_subscription_id")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) throw new Error("Nenhuma assinatura encontrada");
    const session = await getPaddleClient(data.environment).customerPortalSessions.create(sub.paddle_customer_id, [sub.paddle_subscription_id]);
    return session.urls.general.overview;
  });
