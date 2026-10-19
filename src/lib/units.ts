import { useSyncExternalStore } from "react";

export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "ft";
export type DistanceUnit = "km" | "mi";
export type ClockFormat = "24" | "12";
export type CurrencyCode = "BRL" | "USD" | "EUR" | "GBP" | "JPY" | "CHF";

export interface UnitsPrefs {
  weight: WeightUnit;
  height: HeightUnit;
  distance: DistanceUnit;
  clock: ClockFormat;
  currency: CurrencyCode;
}

export const CURRENCIES: { code: CurrencyCode; symbol: string }[] = [
  { code: "BRL", symbol: "R$" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "CHF", symbol: "CHF" },
];

const KEY = "zero-units";
const DEFAULTS: UnitsPrefs = { weight: "kg", height: "cm", distance: "km", clock: "24", currency: "BRL" };

let current: UnitsPrefs = load();
const listeners = new Set<() => void>();

function load(): UnitsPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UnitsPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function getUnits(): UnitsPrefs {
  return current;
}

/** True when the user has explicitly saved unit preferences on this device. */
export function hasStoredUnits(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function setUnits(patch: Partial<UnitsPrefs>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // storage unavailable; keep in-memory only
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useUnits(): UnitsPrefs {
  return useSyncExternalStore(subscribe, getUnits, () => DEFAULTS);
}

const KG_TO_LB = 2.20462;
const KM_TO_MI = 0.621371;
const CM_TO_IN = 0.393701;

/** Convert a stored kilogram value to the preferred weight unit. */
export function weightValue(kg: number, units: UnitsPrefs): number {
  return units.weight === "lb" ? kg * KG_TO_LB : kg;
}

/** Convert a value entered in the preferred unit back to kilograms for storage. */
export function weightToKg(value: number, units: UnitsPrefs): number {
  return units.weight === "lb" ? value / KG_TO_LB : value;
}

export function formatWeight(kg: number, units: UnitsPrefs, digits = 1): string {
  return `${weightValue(kg, units).toFixed(digits)} ${units.weight}`;
}

/** Convert a stored centimeter value to the preferred height unit (feet+inches text or cm number). */
export function formatHeight(cm: number, units: UnitsPrefs): string {
  if (units.height === "ft") {
    const totalIn = cm * CM_TO_IN;
    const ft = Math.floor(totalIn / 12);
    const inch = Math.round(totalIn - ft * 12);
    return `${ft}'${inch}"`;
  }
  return `${Math.round(cm)} cm`;
}

/** Convert a height entered in the preferred unit back to centimeters. Accepts cm number or feet+inches. */
export function heightToCm(value: number, units: UnitsPrefs, inches = 0): number {
  if (units.height === "ft") return (value * 12 + inches) / CM_TO_IN;
  return value;
}

export function formatDistance(km: number, units: UnitsPrefs, digits = 1): string {
  const v = units.distance === "mi" ? km * KM_TO_MI : km;
  return `${v.toFixed(digits)} ${units.distance}`;
}

export function formatMoney(amount: number, units: UnitsPrefs, lang = "pt"): string {
  const locale = { pt: "pt-BR", en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT" }[lang] ?? "pt-BR";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: units.currency }).format(amount);
  } catch {
    return `${units.currency} ${amount.toFixed(2)}`;
  }
}

export function formatClock(date: Date, units: UnitsPrefs): string {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  if (units.clock === "12") {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${h < 12 ? "AM" : "PM"}`;
  }
  return `${h.toString().padStart(2, "0")}:${m}`;
}
