import i18n from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/Logo";
import { Prefs } from "@/components/Prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: i18n.t("shell.authTitle") },
      { name: "description", content: i18n.t("shell.authDescription") },
      { property: "og:title", content: i18n.t("shell.authTitle") },
      { property: "og:description", content: i18n.t("shell.authDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => (typeof s["next"] === "string" ? { next: s["next"] } : {}),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Validated once; external agents' approval screens send users back here after sign-in.
  const rawNext = Route.useSearch().next;
  const next = rawNext ? oauthReturnPath(rawNext) : "";
  const returnUrl = () => window.location.origin + (next ? `/auth?next=${encodeURIComponent(next)}` : "/auth");
  const goOn = () => { if (next && next !== "/") window.location.replace(next); else navigate({ to: "/chat", replace: true }); };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goOn();
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) goOn();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "up") {
        const { error, data } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: returnUrl() } });
        if (error) throw error;
        if (!data.session) toast.success(t("checkEmail"));
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        toast.success(t("resetSent"));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "apple") {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: returnUrl() });
    if (r.error) toast.error(String((r.error as Error).message ?? r.error));
  }

  return (
    <div className="min-h-screen grid-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/"><Logo /></Link>
        <Prefs />
      </header>
      <div className="mx-auto mt-10 max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-3xl font-bold">{mode === "up" ? t("signUp") : mode === "forgot" ? t("forgot") : t("signIn")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("slogan")}</p>
        {mode !== "forgot" && (
          <div className="mt-6 grid gap-2">
            <Button variant="outline" onClick={() => social("google")}>{t("google")}</Button>
            <Button variant="outline" onClick={() => social("apple")}>{t("apple")}</Button>
            <div className="my-2 text-center text-xs uppercase text-muted-foreground">{t("or")}</div>
          </div>
        )}
        <form onSubmit={submit} className="grid gap-3">
          <Input type="email" required placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          {mode !== "forgot" && (
            <Input type="password" required minLength={6} placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
          <Button type="submit" disabled={busy}>{mode === "up" ? t("signUp") : mode === "forgot" ? t("save") : t("signIn")}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <button className="underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>
            {mode === "up" ? t("haveAccount") : t("noAccount")}
          </button>
          <button className="underline" onClick={() => setMode("forgot")}>{t("forgot")}</button>
        </div>
      </div>
    </div>
  );
}
