import { createFileRoute, Link } from "@tanstack/react-router";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { LegalPage } from "@/components/LegalPage";
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: i18n.t("privacy.text1") }, { name: "description", content: i18n.t("privacy.text2") }, { property: "og:title", content: i18n.t("privacy.text3") }, { property: "og:description", content: i18n.t("privacy.text4") }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Privacy,
});
function Privacy() {
  const { t } = useTranslation();
  return <LegalPage title={t("privacy.title")}>
    <section><h2>{t("privacy.text5")}</h2><p>{t("privacy.text6")}<a href="mailto:miguels.avelin@gmail.com">{t("privacy.text7")}</a>{t("privacy.text8")}</p></section>
    <section><h2>{t("privacy.text9")}</h2><ul><li><strong>{t("privacy.text10")}</strong>{t("privacy.text11")}</li><li><strong>{t("privacy.text12")}</strong>{t("privacy.text13")}</li><li><strong>{t("privacy.text14")}</strong>{t("privacy.text15")}</li><li><strong>{t("privacy.text16")}</strong>{t("privacy.text17")}</li><li><strong>{t("privacy.text18")}</strong>{t("privacy.text19")}</li><li><strong>{t("privacy.text20")}</strong>{t("privacy.text21")}</li></ul></section>
    <section><h2>{t("privacy.text22")}</h2><p>{t("privacy.text23")}</p><p>{t("privacy.text24")}</p></section>
    <section><h2>{t("privacy.text25")}</h2><p>{t("privacy.text26")}</p><p>{t("privacy.text27")}<a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer">{t("privacy.text28")}</a>{t("privacy.text29")}</p><p>{t("privacy.text30")}</p></section>
    <section><h2>{t("privacy.text31")}</h2><p>{t("privacy.text32")}</p></section>
    <section><h2>{t("privacy.text33")}</h2><p>{t("privacy.text34")}</p><p>{t("privacy.text35")}<Link to="/conta">{t("privacy.text36")}</Link>{t("privacy.text37")}</p><p>{t("privacy.text38")}<a href="mailto:miguels.avelin@gmail.com">{t("privacy.text39")}</a>{t("privacy.text40")}<a href="https://paddle.net" target="_blank" rel="noopener noreferrer">{t("privacy.text41")}</a>{t("privacy.text42")}</p></section>
    <section><h2>{t("privacy.text43")}</h2><p>{t("privacy.text44")}</p></section>
    <section><h2>{t("privacy.text45")}</h2><p>{t("privacy.text46")}</p></section>
    <section><h2>{t("privacy.text47")}</h2><p>{t("privacy.text48")}</p><p>{t("privacy.text49")}</p></section>
  </LegalPage>;
}