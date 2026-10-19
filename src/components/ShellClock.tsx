import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";

export function ShellClock() {
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState("—");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString(i18n.language));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [i18n.language]);
  return <Link to="/tempo" aria-label={t("shellClock.label")} title={t("shellClock.label")} className="flex shrink-0 items-center gap-2 px-3 py-2 text-time md:mb-4"><Clock3 className="size-4" /><span className="w-20 font-mono text-sm tabular-nums">{time}</span></Link>;
}