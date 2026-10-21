import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import core from "@/locales/core";
import money from "@/locales/money";
import time from "@/locales/time";
import system from "@/locales/system";
import plans from "@/locales/plans";
import legal from "@/locales/legal";
import audit from "@/locales/audit";
import agents from "@/locales/agents";
import adminExtra from "@/locales/admin-extra";
import deviceSetup from "@/locales/device-setup";
import coupon from "@/locales/coupon";
import chatProgress from "@/locales/chat-progress";
import customEntries from "@/locales/custom-entries";
import barcode from "@/locales/barcode";
import billing from "@/locales/billing";

export const LANGS = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
] as const;

type LangCode = (typeof LANGS)[number]["code"];
type DictTree = Record<string, unknown>;

function deepMerge(target: DictTree, source: DictTree): DictTree {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const existing = target[key];
      target[key] = deepMerge(existing && typeof existing === "object" && !Array.isArray(existing) ? (existing as DictTree) : {}, value as DictTree);
    } else {
      target[key] = value;
    }
  }
  return target;
}

const modules = [core, money, time, system, plans, legal, audit, agents, adminExtra, deviceSetup, coupon, chatProgress, customEntries, barcode, billing] as const;

function buildResources() {
  const resources: Record<string, { translation: DictTree }> = {};
  for (const lang of LANGS) {
    const translation: DictTree = {};
    for (const mod of modules) {
      const dict = (mod as Record<string, DictTree | undefined>)[lang.code as LangCode];
      if (dict) deepMerge(translation, dict);
    }
    resources[lang.code] = { translation };
  }
  return resources;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: buildResources(),
    lng: "pt",
    fallbackLng: "pt",
    interpolation: { escapeValue: false },
    returnObjects: true,
  });
}

export default i18n;
