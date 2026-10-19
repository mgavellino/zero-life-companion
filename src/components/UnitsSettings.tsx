import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Ruler, Scale, Clock3, Coins } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES, hasStoredUnits, setUnits, useUnits, type CurrencyCode, type ClockFormat, type DistanceUnit, type HeightUnit, type WeightUnit } from "@/lib/units";
import { preferencesQuery } from "@/components/Onboarding";

export function UnitsSettings() {
  const { t } = useTranslation();
  const units = useUnits();
  const { data: prefs } = useQuery(preferencesQuery);

  // Seed the local currency from the account preference when the user never chose one on this device.
  useEffect(() => {
    if (prefs?.currency && !hasStoredUnits()) setUnits({ currency: prefs.currency as CurrencyCode });
  }, [prefs?.currency]);

  const rows: {
    icon: typeof Scale;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }[] = [
    {
      icon: Scale,
      label: t("units.weight"),
      value: units.weight,
      onChange: (v) => setUnits({ weight: v as WeightUnit }),
      options: [
        { value: "kg", label: "kg" },
        { value: "lb", label: "lb" },
      ],
    },
    {
      icon: Ruler,
      label: t("units.height"),
      value: units.height,
      onChange: (v) => setUnits({ height: v as HeightUnit }),
      options: [
        { value: "cm", label: "cm" },
        { value: "ft", label: "ft/in" },
      ],
    },
    {
      icon: Ruler,
      label: t("units.distance"),
      value: units.distance,
      onChange: (v) => setUnits({ distance: v as DistanceUnit }),
      options: [
        { value: "km", label: "km" },
        { value: "mi", label: "mi" },
      ],
    },
    {
      icon: Clock3,
      label: t("units.clock"),
      value: units.clock,
      onChange: (v) => setUnits({ clock: v as ClockFormat }),
      options: [
        { value: "24", label: "24h" },
        { value: "12", label: "12h (AM/PM)" },
      ],
    },
    {
      icon: Coins,
      label: t("units.currency"),
      value: units.currency,
      onChange: (v) => setUnits({ currency: v as CurrencyCode }),
      options: CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` })),
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold">{t("units.title")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <row.icon className="size-4 shrink-0" />
              <span className="truncate">{row.label}</span>
            </span>
            <Select value={row.value} onValueChange={row.onChange}>
              <SelectTrigger className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {row.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </section>
  );
}
