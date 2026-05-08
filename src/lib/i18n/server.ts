// Helpers de i18n para Server Components (Next.js App Router).
// Client components devem continuar usando useT() do I18nProvider.

import { cookies, headers } from "next/headers";
import { dict, type TKey, translate } from "./dict";
import { LOCALES, type Locale, DEFAULT_LOCALE } from "./locales";

/**
 * Detecta o locale do request server-side, na ordem:
 *  1. cookie `atb_locale` (setado pelo middleware ou switcher client)
 *  2. header `Accept-Language`
 *  3. fallback `pt`
 */
export function getServerLocale(): Locale {
  try {
    const c = cookies();
    const cookieLocale = c.get("atb_locale")?.value;
    if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
      return cookieLocale as Locale;
    }
  } catch {}

  try {
    const h = headers();
    const al = (h.get("accept-language") || "").toLowerCase();
    if (al.startsWith("pt")) return "pt";
    if (al.startsWith("es")) return "es";
    if (al.startsWith("de")) return "de";
    if (al.startsWith("it")) return "it";
    if (al.startsWith("ja")) return "ja";
    if (al.startsWith("en")) return "en";
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
