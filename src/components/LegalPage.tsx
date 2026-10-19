import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Prefs } from "./Prefs";
import { LegalLinks } from "./LegalLinks";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return <div className="min-h-screen">
    <header className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-6"><Link to="/" aria-label={t("legalPage.home")}><Logo /></Link><Prefs /></header>
    <main className="mx-auto max-w-4xl px-5 py-10">
      <p className="text-sm text-muted-foreground">{t("legalPage.info")}</p>
      <h1 className="mt-3 break-words text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t("legalPage.updated")}</p>
      <article className="mt-10 space-y-8 break-words text-base leading-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:underline [&_a]:underline-offset-4">{children}</article>
    </main>
    <footer className="mx-auto max-w-4xl border-t px-5 py-8"><LegalLinks /></footer>
  </div>;
}