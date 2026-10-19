import { Environment, Paddle, EventName } from "@paddle/paddle-node-sdk";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export { EventName };
export type PaddleEnv = "sandbox" | "live";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev/paddle";

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === "sandbox" ? getEnv("PADDLE_SANDBOX_API_KEY") : getEnv("PADDLE_LIVE_API_KEY");
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");
  return new Paddle(connectionApiKey, {
    environment: GATEWAY_BASE_URL as unknown as Environment,
    customHeaders: { "X-Connection-Api-Key": connectionApiKey, "Lovable-API-Key": lovableApiKey },
  });
}

export async function gatewayFetch(env: PaddleEnv, path: string, init?: RequestInit): Promise<Response> {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");
  return fetch(`${GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
      ...init?.headers,
    },
  });
}

export function getWebhookSecret(env: PaddleEnv): string {
  return env === "sandbox" ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET") : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();
  if (!signature || !body) throw new Error("Missing signature or body");
  return await getPaddleClient(env).webhooks.unmarshal(body, getWebhookSecret(env), signature);
}

/** Environment the current build talks to (test token in preview, live when published). */
export function serverPaddleEnv(): PaddleEnv {
  const tok = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;
  return tok?.startsWith("test_") ? "sandbox" : "live";
}
