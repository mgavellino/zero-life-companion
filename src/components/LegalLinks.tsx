import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

export function LegalLinks() {
  const { t } = useTranslation();
  return <nav aria-label={t("legalLinks.label")} className="flex min-w-0 flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
    <Link to="/privacy" className="underline-offset-4 hover:underline">{t("legalLinks.privacy")}</Link>
    <Link to="/terms" className="underline-offset-4 hover:underline">{t("legalLinks.terms")}</Link>
    <Link to="/refund" className="underline-offset-4 hover:underline">{t("legalLinks.refund")}</Link>
    <a href="mailto:miguels.avelin@gmail.com" className="underline-offset-4 hover:underline">{t("legalLinks.contact")}</a>
  </nav>;
}