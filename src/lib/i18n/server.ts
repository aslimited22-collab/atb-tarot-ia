// Helpers de i18n para Server Components (Next.js App Router).
// Client components devem continuar usando useT() do I18nProvider.

import { cookies, headers } from "next/headers";
import { dict, type TKey, translate } from "./dict";
import { LOCALES, type Locale, DEFAULT_LOCALE, localeFromSignals } from "./locales";

/**
 * Detecta o locale do request server-side, na ordem:
 *  1. escolha MANUAL (cookie `atb_locale_set=1` + `atb_locale`) — respeitada
 *  2. geo-IP + Accept-Language via localeFromSignals (mesma regra do middleware:
 *     inglês só por geo, ambíguo → pt). Ignora cookie auto pra bater com o
 *     middleware e auto-corrigir 'en' grudado.
 *  3. fallback `pt`
 */
export function getServerLocale(): Locale {
  try {
    const c = cookies();
    const explicit = c.get("atb_locale_set")?.value === "1";
    const cookieLocale = c.get("atb_locale")?.value;
    if (explicit && cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
      return cookieLocale as Locale;
    }
  } catch {}

  try {
    const h = headers();
    const country = h.get("x-vercel-ip-country") || "";
    const al = h.get("accept-language") || "";
    return localeFromSignals(country, al);
  } catch {}

  return DEFAULT_LOCALE;
}

/**
 * Retorna uma função `t(key, vars?)` para usar em Server Components.
 * Suporta interpolação simples {var} no valor.
 */
export function getServerT() {
  const locale = getServerLocale();
  function t(key: TKey, vars?: Record<string, string | number>): string {
    let s = translate(locale, key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return s;
  }
  return { t, locale };
}
