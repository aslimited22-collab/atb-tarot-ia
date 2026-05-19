// Pricing centralizado por plano + moeda — usado pelo roteador
// /api/checkout/[plan] pra criar Stripe Checkout sessions com price_data inline.
//
// Convenção: valores em centavos (Stripe). JPY não tem decimais, então o valor
// inteiro vai direto. Ex.: $50.00 = 5000, ¥7500 = 7500.

export type PlanId =
  | "premium"
  | "basic"
  | "videochamada"
  | "limpeza"
  | "pergunta1"
  | "pergunta3"
  | "pergunta7";
export type Currency = "brl" | "usd" | "eur" | "jpy";
export type CheckoutMode = "subscription" | "payment";

/**
 * Preços por plano e moeda, em centavos (exceto JPY que não tem decimal).
 * Espelha os valores mostrados na landing via dict.ts.
 */
// Estratégia: MESMO NÚMERO em todas as moedas (não converter cambialmente).
// R$14,90 → $14.90 → €14,90 → ¥1490. Padrão "charm pricing" global —
// cliente intl percebe o mesmo valor psicológico que o BR.
export const PLAN_PRICES: Record<PlanId, Record<Currency, number>> = {
  premium: {
    brl: 25000, // R$250,00/mês
    usd: 25000, // $250.00/month
    eur: 25000, // €250,00/mês
    jpy: 25000, // ¥25000/月
  },
  basic: {
    brl: 2900, // R$29,00/mês
    usd: 2900, // $29.00/month
    eur: 2900, // €29,00/mês
    jpy: 2900, // ¥2900/月
  },
  videochamada: {
    brl: 49700, // R$497,00 (one-time)
    usd: 49700, // $497.00
    eur: 49700, // €497,00
    jpy: 49700, // ¥49700
  },
  limpeza: {
    brl: 10000, // R$100,00 (one-time)
    usd: 10000, // $100.00
    eur: 10000, // €100,00
    jpy: 10000, // ¥10000
  },
  // ─── Funil de entrada (perguntas avulsas one-time) ───
  // Cliente paga → cria conta → faz N perguntas no /dashboard/chat.
  // Webhook (Kiwify ou Stripe) incrementa users.chat_credits_balance += N.
  pergunta1: {
    brl: 1490, // R$14,90
    usd: 1490, // $14.90
    eur: 1490, // €14,90
    jpy: 1490, // ¥1490
  },
  pergunta3: {
    brl: 1990, // R$19,90
    usd: 1990, // $19.90
    eur: 1990, // €19,90
    jpy: 1990, // ¥1990
  },
  pergunta7: {
    brl: 3990, // R$39,90
    usd: 3990, // $39.90
    eur: 3990, // €39,90
    jpy: 3990, // ¥3990
  },
};

/**
 * Quantidade de créditos que cada plano de pergunta gera.
 * Usado por webhooks Kiwify/Stripe ao confirmar pagamento.
 */
export const PERGUNTA_CREDITS: Record<"pergunta1" | "pergunta3" | "pergunta7", number> = {
  pergunta1: 1,
  pergunta3: 3,
  pergunta7: 7,
};

/**
 * Tipo de pagamento por plano: subscription mensal ou one-time.
 * Determina o `mode` no Stripe Checkout.
 */
export const PLAN_TYPE: Record<PlanId, CheckoutMode> = {
  premium: "subscription",
  basic: "subscription",
  videochamada: "payment",
  limpeza: "payment",
  pergunta1: "payment",
  pergunta3: "payment",
  pergunta7: "payment",
};

/**
 * Mapa de URL Kiwify por plano (env vars). Usado pelo branch BR do roteador.
 *
 * Cliente quer todos os pagamentos BR num único painel (Kiwify), incluindo
 * as perguntas avulsas pergunta1/3/7 — produtos criados manualmente via Chrome MCP.
 */
export function kiwifyUrlFor(plan: PlanId): string | undefined {
  const map: Record<PlanId, string | undefined> = {
    premium: process.env.NEXT_PUBLIC_KIWIFY_PREMIUM_URL,
    basic: process.env.NEXT_PUBLIC_KIWIFY_BASIC_URL,
    videochamada: process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL,
    limpeza: process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL,
    pergunta1: process.env.NEXT_PUBLIC_KIWIFY_PERGUNTA1_URL,
    pergunta3: process.env.NEXT_PUBLIC_KIWIFY_PERGUNTA3_URL,
    pergunta7: process.env.NEXT_PUBLIC_KIWIFY_PERGUNTA7_URL,
  };
  return map[plan];
}

/**
 * Nome do produto pra mostrar no Stripe Checkout, em PT por padrão.
 * Server-side simples — não tenta resolver i18n no momento (Stripe Checkout já
 * traduz UI conforme `locale` da session).
 */
export function planDisplayName(plan: PlanId): string {
  return {
    premium: "ATB Tarot — Premium (Consulta com ATB)",
    basic: "ATB Tarot — Basic",
    videochamada: "ATB — Vídeo Chamada ao Vivo",
    limpeza: "ATB — Limpeza Espiritual Personalizada",
    pergunta1: "ATB — 1 Pergunta Espiritual",
    pergunta3: "ATB — 3 Perguntas Espirituais",
    pergunta7: "ATB — 7 Perguntas Espirituais",
  }[plan];
}

/**
 * Mapeia locale interno (pt/en/es/de/it/ja) pra locale aceito pelo Stripe Checkout.
 * Stripe não aceita "pt", só "pt-BR".
 */
export function stripeLocale(locale: string): string {
  const lc = locale.toLowerCase();
  if (lc === "pt" || lc === "pt-br" || lc.startsWith("pt-")) return "pt-BR";
  if (lc === "en" || lc.startsWith("en-")) return "en";
  if (lc === "es" || lc.startsWith("es-")) return "es";
  if (lc === "de" || lc.startsWith("de-")) return "de";
  if (lc === "it" || lc.startsWith("it-")) return "it";
  if (lc === "ja" || lc.startsWith("ja-")) return "ja";
  return "auto";
}

/**
 * Type guard: confirma se a string é um PlanId válido.
 */
export function isValidPlan(s: string): s is PlanId {
  return (
    s === "premium" ||
    s === "basic" ||
    s === "videochamada" ||
    s === "limpeza" ||
    s === "pergunta1" ||
    s === "pergunta3" ||
    s === "pergunta7"
  );
}

/**
 * Type guard mais restrito pra planos de "pergunta avulsa".
 */
export function isPerguntaPlan(s: string): s is "pergunta1" | "pergunta3" | "pergunta7" {
  return s === "pergunta1" || s === "pergunta3" || s === "pergunta7";
}
