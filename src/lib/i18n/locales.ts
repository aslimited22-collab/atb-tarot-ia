export const LOCALES = ["pt", "en", "es", "de", "it", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt";

export const LOCALE_LABELS: Record<Locale, { flag: string; name: string }> = {
  pt: { flag: "🇧🇷", name: "Português" },
  en: { flag: "🇺🇸", name: "English" },
  es: { flag: "🇪🇸", name: "Español" },
  de: { flag: "🇩🇪", name: "Deutsch" },
  it: { flag: "🇮🇹", name: "Italiano" },
  ja: { flag: "🇯🇵", name: "日本語" },
};

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const saved = localStorage.getItem("atb_locale");
  if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;

  const nav = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
  const prefix = nav.split("-")[0];
  if (LOCALES.includes(prefix as Locale)) return prefix as Locale;

  return DEFAULT_LOCALE;
}

export function saveLocale(locale: Locale) {
  if (typeof window !== "undefined") {
    localStorage.setItem("atb_locale", locale);
  }
}
