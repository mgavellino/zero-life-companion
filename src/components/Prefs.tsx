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
import i18n, { LANGS } from "@/lib/i18n";

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('zero-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`;

export function usePrefsBootstrap() {
  useEffect(() => {
    const l = localStorage.getItem("zero-lang") ?? navigator.language.slice(0, 2);
    if (LANGS.some((x) => x.code === l) && l !== i18n.language) setTimeout(() => i18n.changeLanguage(l), 50);
  }, []);
  useEffect(() => {
    const onChange = (l: string) => (document.documentElement.lang = l);
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, []);
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Theme"
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
  const { i18n: inst } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 uppercase" aria-label="Language">
          <Languages className="size-4" /> {inst.language}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => {
              inst.changeLanguage(l.code);
              localStorage.setItem("zero-lang", l.code);
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
