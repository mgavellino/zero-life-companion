import { createFileRoute } from "@tanstack/react-router";
import { Page, Card } from "@/components/Page";
import { Prefs } from "@/components/Prefs";
import { PushSettings } from "@/components/PushSettings";
import { CalendarConnection } from "@/components/CalendarConnection";
import { InstallZero } from "@/components/InstallZero";
import { PrivacyControls } from "@/components/PrivacyControls";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Zero" },
      { name: "description", content: "Ajuste tema, idioma, notificações, agenda e privacidade do Zero." },
      { property: "og:title", content: "Configurações — Zero" },
      { property: "og:description", content: "Ajuste tema, idioma, notificações, agenda e privacidade do Zero." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  return (
    <Page title="Configurações" kicker="Ajustes">
      <Card className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Aparência e idioma</p>
        <div className="mt-4"><Prefs /></div>
      </Card>
      <PushSettings />
      <CalendarConnection />
      <div className="my-4"><InstallZero /></div>
      <PrivacyControls />
    </Page>
  );
}
