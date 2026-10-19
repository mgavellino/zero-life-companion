import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { exportPersonalData, withdrawHealthConsent } from "@/lib/preferences.functions";
import { Onboarding, preferencesQuery } from "./Onboarding";
import { Button } from "./ui/button";

export function PrivacyControls() {
  const { t } = useTranslation();
  const [edit, setEdit] = useState(false), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false);
  const qc = useQueryClient(), exportData = useServerFn(exportPersonalData), withdraw = useServerFn(withdrawHealthConsent);
  const { data } = useQuery(preferencesQuery);
  if (edit) return <Onboarding onDone={() => setEdit(false)} />;
  return <section className="mb-10 border-y py-6">
    <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="size-5" />{t("privacyCtl.title")}</h2>
    <p className="mb-3 text-sm text-muted-foreground">{t("privacyCtl.description")}</p>
    <p className="mb-4 text-sm">{t("privacyCtl.health")} <b>{data?.health_consent_at ? t("privacyCtl.authorized") : t("privacyCtl.unauthorized")}</b></p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEdit(true)}>{t("privacyCtl.review")}</Button><Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true); try { const result = await exportData(); const url = URL.createObjectURL(new Blob([result], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = t("privacyCtl.filename"); anchor.click(); URL.revokeObjectURL(url); } catch { toast.error(t("privacyCtl.exportError")); } finally { setBusy(false); }
    }}><Download className="size-4" />{t("privacyCtl.export")}</Button>{data?.health_consent_at && <Button variant="outline" onClick={() => setConfirm(true)}>{t("privacyCtl.withdraw")}</Button>}</div>
    {confirm && <div className="mt-5 space-y-3"><p className="text-sm">{t("privacyCtl.warning")}</p><div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={async () => { setBusy(true); try { await withdraw(); await qc.invalidateQueries(); setConfirm(false); toast.success(t("privacyCtl.withdrawn")); } catch { toast.error(t("privacyCtl.error")); } finally { setBusy(false); } }}>{t("privacyCtl.confirm")}</Button><Button variant="ghost" onClick={() => setConfirm(false)}>{t("privacyCtl.cancel")}</Button></div></div>}
  </section>;
}