// Normalizador de telefone para E.164.
// Suporta principalmente Brasil (default) e detecta DDI quando começa com +.
//
// Casos cobertos:
//   "(47) 99999-1234"  -> "+5547999991234"
//   "47 99999 1234"    -> "+5547999991234"
//   "+1 415 555 0100"  -> "+14155550100"
//   "11999999999"      -> "+5511999999999"
//   "9999-1234"        -> null (sem DDD)
//   ""                 -> null

const BRAZIL_DDI = "+55";

export type PhoneResult = { e164: string | null; reason?: string };

export function toE164BR(input: string | null | undefined): PhoneResult {
  if (!input) return { e164: null, reason: "empty" };

  const raw = String(input).trim();
  if (!raw) return { e164: null, reason: "empty" };

  // Mantém somente dígitos e o + inicial
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D+/g, "");
  if (digits.length < 10) return { e164: null, reason: "too_short" };
  if (digits.length > 15) return { e164: null, reason: "too_long" };

  // Já vinha com + (assume DDI explícito)
  if (hasPlus) return { e164: `+${digits}` };

  // Brasileiro com DDI (5547999991234, 13 dígitos)
  if (digits.length === 13 && digits.startsWith("55")) {
    return { e164: `+${digits}` };
  }

  // Brasileiro sem DDI mas com DDD (11 dígitos celular ou 10 fixo)
  if (digits.length === 11 || digits.length === 10) {
    return { e164: `${BRAZIL_DDI}${digits}` };
  }

  // Outros países: assume que o número JÁ é internacional sem +
  if (digits.length >= 11 && digits.length <= 15) {
    return { e164: `+${digits}` };
  }

  return { e164: null, reason: "unrecognized_format" };
}

/**
 * Máscara de exibição BR para inputs: (47) 99999-1234 / (47) 9999-1234
 * Idempotente: se já tem máscara, reformata. Não-destrutiva.
 */
export function formatPhoneBR(input: string): string {
  const d = String(input || "").replace(/\D+/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
