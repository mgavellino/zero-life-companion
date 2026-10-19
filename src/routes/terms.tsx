import { createFileRoute } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/LegalPage";
export const Route = createFileRoute("/terms")({
  staticData: { sitemap: true },
  head: () => ({ meta: [{ title: i18n.t("terms.text1") }, { name: "description", content: i18n.t("terms.text2") }, { property: "og:title", content: i18n.t("terms.text3") }, { property: "og:description", content: i18n.t("terms.text4") }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Terms,
});
function Terms() {
  const { t } = useTranslation();
  return <LegalPage title={t("terms.title")}>
    <section><h2>{t("terms.text5")}</h2><p>{t("terms.text6")}</p><p>{t("terms.text7")}</p></section>
    <section><h2>{t("terms.text8")}</h2><p>{t("terms.text9")}</p></section>
    <section><h2>{t("terms.text10")}</h2><ul><li>{t("terms.text11")}</li><li>{t("terms.text12")}</li><li>{t("terms.text13")}</li><li>{t("terms.text14")}</li></ul><p>{t("terms.text15")}<a href="mailto:miguels.avelin@gmail.com">{t("terms.text16")}</a>{t("terms.text17")}</p></section>
    <section><h2>{t("terms.text18")}</h2><p>{t("terms.text19")}</p></section>
    <section><h2>{t("terms.text20")}</h2><p>{t("terms.text21")}</p><p>{t("terms.text22")}</p></section>
    <section><h2>{t("terms.text23")}</h2><p>{t("terms.text24")}</p><p>{t("terms.text25")}</p><p>{t("terms.text26")}<a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">{t("terms.text27")}</a>{t("terms.text28")}<a href="https://paddle.net" target="_blank" rel="noopener noreferrer">{t("terms.text29")}</a>{t("terms.text30")}</p></section>
    <section><h2>{t("terms.text31")}</h2><p>{t("terms.text32")}</p><p>{t("terms.text33")}</p></section>
    <section><h2>{t("terms.text34")}</h2><p>{t("terms.text35")}<a href="mailto:miguels.avelin@gmail.com">{t("terms.text36")}</a>{t("terms.text37")}<a href="https://paddle.net" target="_blank" rel="noopener noreferrer">{t("terms.text38")}</a>{t("terms.text39")}</p></section>
  </LegalPage>;
}