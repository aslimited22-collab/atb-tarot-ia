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

  // 1. localStorage (preferência explícita do usuário via switcher)
  const saved = localStorage.getItem("atb_locale");
  if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;

  // 2. cookie atb_locale (setado pelo middleware no server-side)
  const cookieLocale = readCookie("atb_locale");
  if (cookieLocale && LOCALES.includes(cookieLocale as Locale)) {
    // sincroniza pro localStorage para uso futuro
    localStorage.setItem("atb_locale", cookieLocale);
    return cookieLocale as Locale;
  }

  // 3. navigator.language
  const nav = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
  const prefix = nav.split("-")[0];
  if (LOCALES.includes(prefix as Locale)) return prefix as Locale;

  return DEFAULT_LOCALE;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export function saveLocale(locale: Locale) {
  if (typeof window !== "undefined") {
    localStorage.setItem("atb_locale", locale);
    // Também sincroniza com cookie para que server components vejam a escolha
    document.cookie = `atb_locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }
}
