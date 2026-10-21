import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScanBarcode } from "lucide-react";
import { Card } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lookupBarcode, saveBarcodeMeal, type BarcodeProduct } from "@/lib/barcode.functions";

type Stopper = { stop: () => void };

/** Scan (camera) or type a barcode, look it up in Open Food Facts and log it without AI. */
export function BarcodeScanner() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const lookup = useServerFn(lookupBarcode);
  const save = useServerFn(saveBarcodeMeal);
  const video = useRef<HTMLVideoElement>(null);
  const stopper = useRef<Stopper | null>(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [grams, setGrams] = useState("100");

  const stop = () => { stopper.current?.stop(); stopper.current = null; setScanning(false); };
  useEffect(() => stop, []);

  async function find(c: string) {
    setBusy(true); setProduct(null);
    try {
      const { product: p } = await lookup({ data: { code: c } });
      if (!p) toast.error(t("barcode.notFound"));
      else { setProduct(p); setGrams(String(p.serving_g ?? 100)); }
    } catch { toast.error(t("barcode.notFound")); }
    finally { setBusy(false); }
  }

  async function start() {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 0));
    const el = video.current; if (!el) return;
    const found = (c: string) => { stop(); setCode(c); void find(c); };
    try {
      const BD = (window as unknown as { BarcodeDetector?: new (o: unknown) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      if (BD) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        el.srcObject = stream; await el.play();
        const det = new BD({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        let alive = true;
        stopper.current = { stop: () => { alive = false; stream.getTracks().forEach((x) => x.stop()); } };
        const tick = async () => {
          if (!alive) return;
          try { const r = await det.detect(el); if (r[0]?.rawValue) return found(r[0].rawValue); } catch { /* keep trying */ }
          setTimeout(tick, 250);
        };
        void tick();
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const controls = await new BrowserMultiFormatReader().decodeFromConstraints({ video: { facingMode: "environment" } }, el, (res) => { if (res) found(res.getText()); });
        stopper.current = controls;
      }
    } catch { stop(); toast.error(t("barcode.noCamera")); }
  }

  async function logMeal() {
    if (!product) return;
    setBusy(true);
    try {
      const h = new Date().getHours();
      await save({ data: { product, grams: Number(grams.replace(",", ".")), meal_type: h < 11 ? "cafe" : h < 15 ? "almoco" : h < 18 ? "lanche" : "jantar" } });
      toast.success(t("barcode.saved")); setProduct(null); setCode("");
      qc.invalidateQueries({ queryKey: ["meals"] });
    } catch (e) { toast.error(e instanceof Error ? e.message.replace(/^LIMIT:\s*/, "") : t("barcode.notFound")); }
    finally { setBusy(false); }
  }

  async function saveFood() {
    if (!product) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("custom_foods").insert({ user_id: u.user?.id, name: product.name, kcal_100g: product.kcal_100g, protein_100g: product.protein_100g, carbs_100g: product.carbs_100g, fat_100g: product.fat_100g, unit_grams: product.serving_g } as never);
    if (error) toast.error(t("customEntries.invalid"));
    else { toast.success(t("customEntries.saved")); qc.invalidateQueries({ queryKey: ["custom_foods"] }); }
  }

  return (
    <Card className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><ScanBarcode className="size-5" />{t("barcode.title")}</h2>
      {scanning ? (
        <div className="space-y-2">
          <video ref={video} muted playsInline className="aspect-video w-full rounded-lg bg-muted object-cover" />
          <Button variant="outline" className="w-full" onClick={stop}>{t("barcode.stop")}</Button>
        </div>
      ) : (
        <Button className="w-full" onClick={start}>{t("barcode.scan")}</Button>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) void find(code); }}>
        <Input inputMode="numeric" placeholder={t("barcode.manual")} aria-label={t("barcode.manual")} value={code} onChange={(e) => setCode(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={busy}>{t("barcode.find")}</Button>
      </form>
      {product && (
        <div className="mt-4 space-y-3 rounded-lg border p-3">
          <div>
            <p className="font-semibold">{product.name}</p>
            <p className="text-xs text-muted-foreground">100 g: {product.kcal_100g} kcal · P {product.protein_100g} · C {product.carbs_100g} · G {product.fat_100g}</p>
          </div>
          <Input inputMode="decimal" aria-label={t("barcode.grams")} placeholder={t("barcode.grams")} value={grams} onChange={(e) => setGrams(e.target.value)} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={logMeal} disabled={busy}>{t("barcode.save")}</Button>
            <Button variant="outline" onClick={saveFood}>{t("barcode.saveFood")}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
