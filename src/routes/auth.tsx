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

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Zero" },
      { name: "description", content: "Entre ou crie sua conta no Zero." },
      { property: "og:title", content: "Entrar — Zero" },
      { property: "og:description", content: "Entre ou crie sua conta no Zero." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/chat", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/chat", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "up") {
        const { error, data } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/chat" } });
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
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
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
