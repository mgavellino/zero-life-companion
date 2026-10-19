import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { exportPersonalData, withdrawHealthConsent } from "@/lib/preferences.functions";
import { Onboarding, preferencesQuery } from "./Onboarding";
import { Button } from "./ui/button";

export function PrivacyControls() {
  const [edit, setEdit] = useState(false), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false);
  const qc = useQueryClient(), exportData = useServerFn(exportPersonalData), withdraw = useServerFn(withdrawHealthConsent);
  const { data } = useQuery(preferencesQuery);
  if (edit) return <Onboarding onDone={() => setEdit(false)} />;
  return <section className="mb-10 border-y py-6">
    <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="size-5" />Privacidade e preferências</h2>
    <p className="mb-3 text-sm text-muted-foreground">Suas conversas e registros pessoais não são acessíveis a outros usuários. A administração gerencia planos e cobrança, sem acesso ao conteúdo pessoal.</p>
    <p className="mb-4 text-sm">Dados de saúde: <b>{data?.health_consent_at ? "autorizados" : "não autorizados"}</b></p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEdit(true)}>Revisar minhas escolhas</Button><Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true); try { const result = await exportData(); const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "zero-meus-dados.json"; anchor.click(); URL.revokeObjectURL(url); } catch { toast.error("Não foi possível exportar seus dados."); } finally { setBusy(false); }
    }}><Download className="size-4" />Exportar meus dados</Button>{data?.health_consent_at && <Button variant="outline" onClick={() => setConfirm(true)}>Retirar autorização de saúde</Button>}</div>
    {confirm && <div className="mt-5 space-y-3"><p className="text-sm">Isso apaga suas refeições, atividades e medidas. Mensagens antigas do chat podem conter informações que você escreveu e não serão apagadas por esta ação.</p><div className="flex gap-2"><Button variant="destructive" disabled={busy} onClick={async () => { setBusy(true); try { await withdraw(); await qc.invalidateQueries(); setConfirm(false); toast.success("Autorização retirada e registros de saúde apagados."); } catch { toast.error("Não foi possível concluir. Tente novamente."); } finally { setBusy(false); } }}>Confirmar retirada</Button><Button variant="ghost" onClick={() => setConfirm(false)}>Cancelar</Button></div></div>}
  </section>;
}