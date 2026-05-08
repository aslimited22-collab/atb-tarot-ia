// Formatters Intl centralizados.
// Use sempre estes helpers em vez de toFixed/toLocaleString diretos
// para garantir formato correto por idioma/região.

import type { Locale } from "./locales";

const LOCALE_TO_BCP47: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  ja: "ja-JP",
};

const LOCALE_TO_DEFAULT_CURRENCY: Record<Locale, string> = {
  pt: "BRL",
  en: "USD",
  es: "EUR",
  de: "EUR",
  it: "EUR",
  ja: "JPY",
};

/**
 * Formata moeda respeitando idioma e código ISO de moeda.
 * Ex: formatMoney(97, "BRL", "pt") → "R$ 97,00"
 *     formatMoney(19, "USD", "en") → "$19.00"
 *     formatMoney(2900, "JPY", "ja") → "￥2,900"
 */
export function formatMoney(
  amount: number,
  currency?: string,
  locale: Locale = "pt"
): string {
  const bcp = LOCALE_TO_BCP47[locale] || "pt-BR";
  const ccy = (currency || LOCALE_TO_DEFAULT_CURRENCY[locale]).toUpperCase();
  return new Intl.NumberFormat(bcp, { style: "currency", currency: ccy }).format(amount);
}

/**
 * Formata data com estilo curto/longo.
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale = "pt",
  style: "short" | "medium" | "long" | "full" = "medium"
): string {
  const bcp = LOCALE_TO_BCP47[locale] || "pt-BR";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat(bcp, { dateStyle: style }).format(d);
}

/**
 * Formata data + hora.
 */
export function formatDateTime(
  date: Date | string | number,
  locale: Locale = "pt"
): string {
  const bcp = LOCALE_TO_BCP47[locale] || "pt-BR";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat(bcp, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/**
 * Formata número (não-moeda). Útil para contagens.
 */
export function formatNumber(n: number, locale: Locale = "pt"): string {
  const bcp = LOCALE_TO_BCP47[locale] || "pt-BR";
  return new Intl.NumberFormat(bcp).format(n);
}

/**
 * Tempo relativo ("há 2 horas", "in 3 days").
 */
export function formatRelativeTime(
  fromDate: Date | string | number,
  locale: Locale = "pt"
): string {
  const bcp = LOCALE_TO_BCP47[locale] || "pt-BR";
  const d = typeof fromDate === "string" || typeof fromDate === "number" ? new Date(fromDate) : fromDate;
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(bcp, { numeric: "auto" });

  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 604800), "week");
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), "month");
  return rtf.format(Math.round(diffSec / 31536000), "year");
}
