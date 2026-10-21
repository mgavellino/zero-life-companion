import { mealFromDraft, parseMealDraft, type QuickIntent } from "./quick-intent";

type Macro = { k: number; p: number; c: number; f: number };
const cache = new Map<string, Macro | null>();

/** Open Food Facts (millions of products, free, no key) per-100 g values for a food name. */
export async function lookupFood(name: string): Promise<Macro | null> {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  let result: Macro | null = null;
  try {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(key)}&page_size=5&fields=product_name,nutriments`;
    const res = await fetch(url, { headers: { "User-Agent": "Zero/1.0 (miguels.avelin@gmail.com)" }, signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const json = (await res.json()) as { hits?: { nutriments?: Record<string, number> }[] };
      const hit = json.hits?.map((h) => h.nutriments ?? {}).find((n) => typeof n["energy-kcal_100g"] === "number" && n["energy-kcal_100g"]! > 0 && n["energy-kcal_100g"]! < 950);
      if (hit) result = { k: hit["energy-kcal_100g"]!, p: hit["proteins_100g"] ?? 0, c: hit["carbohydrates_100g"] ?? 0, f: hit["fat_100g"] ?? 0 };
    }
  } catch { /* network issue: let the AI handle it */ }
  if (cache.size > 500) cache.clear();
  cache.set(key, result);
  return result;
}

/** Meals whose foods are not in the local table are completed from the food database before any AI is used. */
export async function resolveMealIntent(text: string, hour: number): Promise<QuickIntent | null> {
  const draft = parseMealDraft(text, hour);
  if (!draft) return null;
  const values = await Promise.all(draft.items.map((i) => i.food ?? lookupFood(i.text.replace(/^\d+(?:[.,]\d+)?\s*\w*\s*(?:de\s+)?/, ""))));
  return mealFromDraft(draft, values, text);
}
