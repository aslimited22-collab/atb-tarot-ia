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

// Países por idioma. INGLÊS é o único que exige sinal GEOGRÁFICO — nunca é
// escolhido pelo idioma do aparelho. Isso protege o público-alvo (Brasil):
// muitas clientes 60+ usam celular configurado em inglês mas NÃO leem inglês.
const ES_COUNTRIES = ["ES", "AR", "MX", "CO", "CL", "PE", "UY", "EC", "BO", "PY", "VE", "GT", "CR", "PA", "DO", "HN", "NI", "SV"];
const DE_COUNTRIES = ["DE", "AT", "CH"];
const EN_COUNTRIES = ["US", "GB", "CA", "AU", "NZ", "IE", "ZA", "IN", "PH", "SG", "NG"];

/**
 * Decide o locale a partir de sinais do request (país geo-IP + Accept-Language).
 * Pura — sem DOM/Node — pode rodar no middleware (edge) e em Server Components.
 *
 * Regra de ouro: o produto é BR-first. Inglês SÓ aparece com sinal geográfico
 * de país anglófono. O idioma do aparelho/navegador nunca seleciona inglês
 * sozinho (senão brasileira com iPhone em inglês cai no site em inglês).
 * Qualquer caso ambíguo → português.
 */
export function localeFromSignals(country?: string | null, acceptLang?: string | null): Locale {
  const c = (country || "").toUpperCase();
  const al = (acceptLang || "").toLowerCase();

  // 1. Geo-IP é o sinal mais forte
  if (c === "BR") return "pt";
  if (ES_COUNTRIES.includes(c)) return "es";
  if (DE_COUNTRIES.includes(c)) return "de";
  if (c === "IT") return "it";
  if (c === "JP") return "ja";
  if (EN_COUNTRIES.includes(c)) return "en"; // inglês só por geo

  // 2. Sem país claro: idioma do dispositivo — MAS nunca inglês aqui
  if (al.startsWith("pt")) return "pt";
  if (al.startsWith("es")) return "es";
  if (al.startsWith("de")) return "de";
  if (al.startsWith("it")) return "it";
  if (al.startsWith("ja")) return "ja";

  // 3. Default BR-first
  return DEFAULT_LOCALE;
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  // 1. Escolha EXPLÍCITA do usuário (LangSwitcher) — só vale com o marcador
  //    'atb_locale_set'. Sem o marcador, um 'atb_locale' antigo no localStorage
  //    é lixo de auto-detecção e deve ser ignorado (não gruda em inglês).
  try {
    if (localStorage.getItem("atb_locale_set") === "1") {
      const saved = localStorage.getItem("atb_locale");
      if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
    }
  } catch {}

  // 2. cookie atb_locale (decisão geo do middleware) — fonte automática de verdade
  const cookieLocale = readCookie("atb_locale");
  if (cookieLocale && LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 3. navigator.language — porém NUNCA inglês (inglês exige geo, via cookie).
  //    Protege brasileira com aparelho em inglês quando o cookie não chega
  //    (ex.: webview do app de email isola cookies no clique do magic-link).
  const nav = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
  const prefix = nav.split("-")[0];
  if (prefix !== "en" && LOCALES.includes(prefix as Locale)) return prefix as Locale;

  // 4. Default BR-first
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
    // Marcador de escolha MANUAL — distingue do valor auto-detectado.
    localStorage.setItem("atb_locale_set", "1");
    // Sincroniza com cookie pra server components verem a escolha + o marcador
    // pro middleware parar de re-detectar por geo.
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `atb_locale=${locale}; path=/; max-age=${maxAge}; samesite=lax`;
    document.cookie = `atb_locale_set=1; path=/; max-age=${maxAge}; samesite=lax`;
  }
}
