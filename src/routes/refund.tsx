import { createFileRoute, Link } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/LegalPage";
export const Route = createFileRoute("/refund")({
  head: () => ({ meta: [{ title: i18n.t("refund.text1") }, { name: "description", content: i18n.t("refund.text2") }, { property: "og:title", content: i18n.t("refund.text3") }, { property: "og:description", content: i18n.t("refund.text4") }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Refund,
});
function Refund() {
  const { t } = useTranslation();
  return <LegalPage title={t("refund.title")}>
    <section><h2>{t("refund.text5")}</h2><p>{t("refund.text6")}<a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">{t("refund.text7")}</a>{t("refund.text8")}</p></section>
    <section><h2>{t("refund.text9")}</h2><p>{t("refund.text10")}<a href="https://paddle.net" target="_blank" rel="noopener noreferrer">{t("refund.text11")}</a>{t("refund.text12")}<a href="mailto:miguels.avelin@gmail.com">{t("refund.text13")}</a>{t("refund.text14")}</p></section>
    <section><h2>{t("refund.text15")}</h2><p>{t("refund.text16")}<Link to="/conta">{t("refund.text17")}</Link>{t("refund.text18")}</p><p>{t("refund.text19")}</p></section>
  </LegalPage>;
}