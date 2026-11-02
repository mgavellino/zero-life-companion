import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/Page";
import { automaticCategory } from "@/lib/bills";
import { money, today } from "@/lib/data";
import { parseStatement, receiptTotal } from "@/lib/money-import";

/** Receipt OCR (on-device, no AI) and OFX/CSV bank statement import. */
export function MoneyImports({ language }: { language: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const photo = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function readPhoto(f: File) {
    setReading(true);
    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(f, "por+eng");
      const total = receiptTotal(data.text);
      const firstLine = data.text.split(/\n/).map((l) => l.trim()).find((l) => /[a-z]{3}/i.test(l)) ?? "";
      setDesc(firstLine.slice(0, 60));
      if (total) { setAmount(String(total)); toast.success(t("fx.receiptFound", { value: money(total, language) })); }
      else toast(t("fx.receiptNone"));
    } catch { toast(t("fx.receiptNone")); }
    finally { setReading(false); }
  }

  async function save(rows: Record<string, unknown>[]) {
    const { error } = await supabase.from("transactions").insert(rows as never);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["transactions"] });
  }

  async function saveReceipt() {
    const value = Number(amount.replace(",", "."));
    if (!(value > 0)) return;
    setBusy(true);
    try {
      const description = desc.trim() || t("fx.receiptTitle");
      await save([{ kind: "expense", amount: value, description, category: automaticCategory(description), occurred_on: today() }]);
      toast.success(t("fx.receiptSave"), { description: money(value, language) });
      setAmount(""); setDesc("");
    } catch { toast.error(t("chat2.saveError", { defaultValue: "—" })); }
    finally { setBusy(false); }
  }

  async function importFile(f: File) {
    setBusy(true);
    try {
      const { rows, skipped } = parseStatement(await f.text());
      if (rows.length) await save(rows);
      toast.success(t("fx.stmtImported", { count: rows.length }), { description: skipped ? t("fx.stmtSkipped", { count: skipped }) : undefined });
    } catch { toast.error(t("fx.stmtSkipped", { count: 0 })); }
    finally { setBusy(false); if (file.current) file.current.value = ""; }
  }

  return (
    <div className="mb-6 grid min-w-0 gap-4 md:grid-cols-2">
      <Card>
        <p className="flex items-center gap-2 font-display font-semibold"><Camera className="size-5" /> {t("fx.receiptTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("fx.receiptHint")}</p>
        <input ref={photo} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && readPhoto(e.target.files[0])} />
        <Button variant="outline" className="mt-3 w-full" disabled={reading} onClick={() => photo.current?.click()}>
          {reading ? <><Loader2 className="size-4 animate-spin" /> {t("fx.receiptReading")}</> : <><Camera className="size-4" /> {t("fx.receiptTitle")}</>}
        </Button>
        {(amount || desc) && (
          <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} aria-label={t("description")} placeholder={t("description")} />
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label={t("amount")} placeholder={t("amount")} />
            <Button onClick={saveReceipt} disabled={busy}>{t("fx.receiptSave")}</Button>
          </div>
        )}
      </Card>
      <Card>
        <p className="flex items-center gap-2 font-display font-semibold"><FileUp className="size-5" /> {t("fx.stmtTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("fx.stmtHint")}</p>
        <input ref={file} type="file" accept=".ofx,.csv,.txt,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        <Button variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => file.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} {t("fx.stmtTitle")}
        </Button>
      </Card>
    </div>
  );
}
