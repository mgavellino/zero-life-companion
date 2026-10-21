import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/plan.server";

export type BarcodeProduct = { code: string; name: string; kcal_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number; serving_g: number | null };

const r1 = (x: unknown) => Math.round((Number(x) || 0) * 10) / 10;

// Looks a barcode up in Open Food Facts (free, no AI).
export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string }) => ({ code: String(i.code).replace(/\D/g, "").slice(0, 14) }))
  .handler(async ({ data }): Promise<{ product: BarcodeProduct | null }> => {
    if (data.code.length < 6) return { product: null };
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data.code}.json?fields=product_name,product_name_pt,brands,nutriments,serving_quantity`, {
        headers: { "user-agent": "Zero/1.0 (miguels.avelin@gmail.com)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return { product: null };
      const j = (await res.json()) as { status?: number; product?: { product_name?: string; product_name_pt?: string; brands?: string; serving_quantity?: number | string; nutriments?: Record<string, unknown> } };
      const p = j.product; const nt = p?.nutriments ?? {};
      let kcal = Number(nt["energy-kcal_100g"]);
      if (!Number.isFinite(kcal) && Number.isFinite(Number(nt["energy_100g"]))) kcal = Number(nt["energy_100g"]) / 4.184;
      if (!p || !Number.isFinite(kcal)) return { product: null };
      const name = [p.product_name_pt || p.product_name, p.brands?.split(",")[0]].filter(Boolean).join(" · ") || data.code;
      const serving = Number(p.serving_quantity);
      return { product: { code: data.code, name: name.slice(0, 80), kcal_100g: Math.round(kcal), protein_100g: r1(nt["proteins_100g"]), carbs_100g: r1(nt["carbohydrates_100g"]), fat_100g: r1(nt["fat_100g"]), serving_g: serving > 0 ? serving : null } };
    } catch (e) {
      console.error("barcode lookup", e);
      return { product: null };
    }
  });

export const saveBarcodeMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { product: BarcodeProduct; grams: number; meal_type: string }) => {
    const g = Number(i.grams);
    if (!(g > 0 && g <= 5000)) throw new Error("Quantidade inválida");
    const p = i.product;
    return {
      grams: g,
      meal_type: ["cafe", "almoco", "lanche", "jantar"].includes(i.meal_type) ? i.meal_type : "lanche",
      name: String(p.name).slice(0, 80),
      kcal: Math.min(950, Math.max(0, Number(p.kcal_100g) || 0)),
      p: Math.min(100, Math.max(0, Number(p.protein_100g) || 0)),
      c: Math.min(100, Math.max(0, Number(p.carbs_100g) || 0)),
      f: Math.min(100, Math.max(0, Number(p.fat_100g) || 0)),
    };
  })
  .handler(async ({ data, context }) => {
    const { data: pref } = await context.supabase.from("user_preferences").select("health_consent_at").eq("user_id", context.userId).maybeSingle();
    if (!pref?.health_consent_at) throw new Error("Autorize o uso dos dados de saúde em Privacidade para registrar refeições.");
    const cap = LIMITS[await getUserPlan(context.supabase as never, context.userId)].mealsPerDay;
    if (cap !== null) {
      const start = new Date(); start.setUTCHours(0, 0, 0, 0);
      const { count } = await context.supabase.from("meals").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString());
      if ((count ?? 0) >= cap) throw new Error(`LIMIT: seu plano permite ${cap} refeições por dia.`);
    }
    const k = data.grams / 100;
    const row = { user_id: context.userId, name: `${data.name} (${Math.round(data.grams)} g)`, meal_type: data.meal_type, calories: Math.round(data.kcal * k), protein: r1(data.p * k), carbs: r1(data.c * k), fat: r1(data.f * k) };
    const { error } = await context.supabase.from("meals").insert(row);
    if (error) throw new Error(error.message);
    return row;
  });
