import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import i18n from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

type Decision = { data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null };
type Details = { client?: { name?: string; client_name?: string; redirect_uri?: string } | null; redirect_uri?: string; scope?: string; redirect_url?: string; redirect_to?: string };
// Typed wrapper for the beta OAuth namespace of the auth client.
const oauth = (supabase.auth as unknown as { oauth: {
  getAuthorizationDetails: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<Decision>;
  denyAuthorization: (id: string) => Promise<Decision>;
} }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: i18n.t("consent.title", { client: "" }).trim() }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "" }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error(i18n.t("consent.invalid"));
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await oauth.getAuthorizationDetails(id);
    if (error || !data) throw new Error(i18n.t("consent.invalid"));
    const immediate = data.redirect_url ?? data.redirect_to;
    if (immediate && !data.client) throw redirect({ href: immediate });
    const { data: user } = await supabase.auth.getUser();
    return { details: data, email: user.user?.email ?? "" };
  },
  pendingComponent: () => <main className="grid min-h-dvh place-items-center p-6 text-muted-foreground">{i18n.t("consent.loading")}</main>,
  errorComponent: ({ error }) => <main className="grid min-h-dvh place-items-center p-6"><p className="max-w-sm text-center">{error instanceof Error ? error.message : i18n.t("consent.invalid")}</p></main>,
  component: Consent,
});

function Consent() {
  const { t } = useTranslation();
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = details.client?.name ?? details.client?.client_name ?? t("consent.anApp");
  const redirectUri = details.client?.redirect_uri ?? details.redirect_uri;
  let host = "";
  try { host = redirectUri ? new URL(redirectUri).host : ""; } catch { host = ""; }

  async function decide(approve: boolean) {
    setBusy(true); setError("");
    try {
      const { data, error } = approve ? await oauth.approveAuthorization(authorization_id) : await oauth.denyAuthorization(authorization_id);
      if (error) throw error;
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) { setError(t("consent.noRedirect")); setBusy(false); return; }
      window.location.href = target;
    } catch { setError(t("consent.failed")); setBusy(false); }
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">{t("consent.title", { client })}</h1>
        {host && <p className="mt-1 text-xs text-muted-foreground">{host}</p>}
        <p className="mt-4 text-sm">{t("consent.explain", { client })}</p>
        <dl className="mt-4 grid gap-2 rounded-xl border p-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">{t("consent.account")}</dt><dd className="break-all font-medium">{email}</dd></div>
          <div><dd>{t("consent.identity")}</dd></div>
        </dl>
        <p className="mt-4 flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />{t("consent.boundary")}</p>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>{t("consent.deny")}</Button>
          <Button disabled={busy} onClick={() => decide(true)}>{t("consent.approve")}</Button>
        </div>
      </section>
    </main>
  );
}
