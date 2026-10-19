import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Nova senha — Zero" },
      { name: "description", content: "Defina uma nova senha no Zero." },
      { property: "og:title", content: "Nova senha — Zero" },
      { property: "og:description", content: "Defina uma nova senha no Zero." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form
        className="grid w-full max-w-sm gap-3 rounded-2xl border bg-card p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.auth.updateUser({ password: pw });
          if (error) {
            toast.error(error.message);
            return;
          }
          navigate({ to: "/chat" });
        }}
      >
        <Logo />
        <Input type="password" minLength={6} required placeholder={t("newPassword")} value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button type="submit">{t("save")}</Button>
      </form>
    </div>
  );
}
