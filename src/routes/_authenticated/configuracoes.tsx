import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Page, Card } from "@/components/Page";
import { Prefs } from "@/components/Prefs";
import { PushSettings } from "@/components/PushSettings";
import { CalendarConnection } from "@/components/CalendarConnection";
import { InstallZero } from "@/components/InstallZero";
import { PrivacyControls } from "@/components/PrivacyControls";
import { VoiceSettings } from "@/components/VoiceSettings";
import { UnitsSettings } from "@/components/UnitsSettings";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: i18n.t("settings.metaTitle") },
      { name: "description", content: i18n.t("settings.metaDescription") },
      { property: "og:title", content: i18n.t("settings.metaTitle") },
      { property: "og:description", content: i18n.t("settings.metaDescription") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { t } = useTranslation();
  return (
    <Page title={t("settings.title")} kicker={t("settings.kicker")}>
      <Card className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("settings.appearance")}</p>
        <div className="mt-4"><Prefs /></div>
      </Card>
      <div className="mb-6"><UnitsSettings /></div>
      <VoiceSettings />
      <PushSettings />
      <CalendarConnection />
      <div className="my-4"><InstallZero /></div>
      <PrivacyControls />
    </Page>
  );
}
