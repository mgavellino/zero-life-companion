import { useEffect, useState } from "react";
import { Moon, Sun, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import i18n, { LANGS } from "@/lib/i18n";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('zero-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`;

export function usePrefsBootstrap() {
  useEffect(() => {
    const stored = localStorage.getItem("zero-lang");
    const detected = navigator.language.slice(0, 2);
    const lang = stored ?? (LANGS.some((x) => x.code === detected) ? detected : "pt");
    if (LANGS.some((x) => x.code === lang) && lang !== i18n.language) void i18n.changeLanguage(lang);
    // Keep server-generated billing notifications in sync with the preference already stored by the app.
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user && data.user.user_metadata?.["language"] !== lang) {
        const { error } = await supabase.auth.updateUser({ data: { language: lang } });
        if (error) console.error("Could not sync language preference");
      }
    })();
  }, []);
  useEffect(() => {
    const onChange = (l: string) => (document.documentElement.lang = l);
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, []);
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("prefs.theme")}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("zero-theme", next ? "dark" : "light");
      }}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function LangSwitch() {
  const { t, i18n: inst } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 uppercase" aria-label={t("prefs.language")}>
          <Languages className="size-4" /> {inst.language}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={async () => {
              inst.changeLanguage(l.code);
              localStorage.setItem("zero-lang", l.code);
              const { data } = await supabase.auth.getUser();
              if (data.user) {
                const { error } = await supabase.auth.updateUser({ data: { language: l.code } });
                if (error) console.error("Could not sync language preference");
              }
            }}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Prefs() {
  return (
    <div className="flex items-center gap-1">
      <LangSwitch />
      <ThemeToggle />
    </div>
  );
}
