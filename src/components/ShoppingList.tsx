import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { Card } from "@/components/Page";
import { useRows } from "@/lib/data";
import { shoppingList } from "@/lib/money-import";

/** Shopping list built from the most-logged foods in the last 30 days; ticks are kept on this device. */
export function ShoppingList() {
  const { t } = useTranslation();
  const { data: meals = [] } = useRows<{ name: string; eaten_on: string }>("meals");
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem("zero-shopping") ?? "[]")); } catch { /* ignore */ } }, []);
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const list = shoppingList(meals.filter((m) => m.eaten_on >= since).map((m) => m.name));
  if (!list.length) return null;
  const toggle = (k: string) => { const next = done.includes(k) ? done.filter((x) => x !== k) : [...done, k]; setDone(next); localStorage.setItem("zero-shopping", JSON.stringify(next)); };
  return (
    <Card className="mt-6">
      <h3 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart className="size-5" /> {t("fx.shopTitle")}</h3>
      <p className="mb-3 text-sm text-muted-foreground">{t("fx.shopHint")}</p>
      <ul className="grid gap-1 sm:grid-cols-2">
        {list.map((i) => (
          <li key={i.item}><label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--signal)]" checked={done.includes(i.item)} onChange={() => toggle(i.item)} />
            <span className={done.includes(i.item) ? "line-through opacity-60" : ""}>{i.item}</span>
            <span className="ml-auto text-xs text-muted-foreground">×{i.count}</span>
          </label></li>
        ))}
      </ul>
    </Card>
  );
}
