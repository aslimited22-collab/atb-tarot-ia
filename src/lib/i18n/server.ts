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
 * Locale ESPECÍFICO pra metadata/SEO (<title>, <meta description>, OG,
 * JSON-LD). Diferente de getServerLocale(): NÃO usa geo-IP — só a escolha
 * EXPLÍCITA do usuário (cookie atb_locale_set=1). Sem isso, sempre `pt`.
 *
 * Por quê: getServerLocale() usa x-vercel-ip-country pra servir conteúdo
 * relevante a visitantes reais (correto pra eles). Mas o Googlebot e outros
 * crawlers costumam geolocalizar como US → o <title>/<meta description>
 * INDEXADOS saíam em inglês, mesmo sendo um negócio 100% BR (verificado:
 * og:locale en-US, description "entertainment purposes only"). Metadata não
 * pode depender de onde o robô está — só da escolha real de um visitante.
 */
export function getSeoLocale(): Locale {
  try {
    const c = cookies();
    const explicit = c.get("atb_locale_set")?.value === "1";
    const cookieLocale = c.get("atb_locale")?.value;
    if (explicit && cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
      return cookieLocale as Locale;
    }
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
