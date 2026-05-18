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
export const PLAN_PRICES: Record<PlanId, Record<Currency, number>> = {
  premium: {
    brl: 25000, // R$250,00/mês
    usd: 5000,  // $50.00/month
    eur: 4500,  // €45,00/mês
    jpy: 7500,  // ¥7,500/月 (sem decimal)
  },
  basic: {
    brl: 2900, // R$29,00/mês
    usd: 900,  // $9.00/month
    eur: 800,  // €8,00/mês
    jpy: 900,  // ¥900/月
  },
  videochamada: {
    brl: 49700, // R$497,00 (one-time)
    usd: 9700,  // $97.00
    eur: 8700,  // €87,00
    jpy: 14000, // ¥14,000
  },
  limpeza: {
    brl: 10000, // R$100,00 (one-time)
    usd: 1900,  // $19.00
    eur: 1800,  // €18,00
    jpy: 2900,  // ¥2,900
  },
  // ─── Funil de entrada barato (perguntas avulsas one-time) ───
  // Cliente paga → cria conta → faz N perguntas no /dashboard/chat.
  // Webhook (Kiwify ou Stripe) incrementa users.chat_credits_balance += N.
  pergunta1: {
    brl: 1490, // R$14,90 — 1 pergunta profunda
    usd:  300, // $3.00
    eur:  280, // €2,80
    jpy:  450, // ¥450
  },
  pergunta3: {
    brl: 1990, // R$19,90 — 3 perguntas
    usd:  400, // $4.00
    eur:  380, // €3,80
    jpy:  600, // ¥600
  },
  pergunta7: {
    brl: 3990, // R$39,90 — 7 perguntas (melhor custo-benefício avulso)
    usd:  800, // $8.00
    eur:  750, // €7,50
    jpy: 1200, // ¥1,200
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
 * Plans `pergunta1/3/7` NÃO usam Kiwify (sem API pública pra criar produto):
 * vão direto pro Stripe mesmo pra clientes BR, com Pix/cartão.
 */
export function kiwifyUrlFor(plan: PlanId): string | undefined {
  if (plan === "pergunta1" || plan === "pergunta3" || plan === "pergunta7") {
    return undefined;
  }
  const map: Record<Exclude<PlanId, "pergunta1" | "pergunta3" | "pergunta7">, string | undefined> = {
    premium: process.env.NEXT_PUBLIC_KIWIFY_PREMIUM_URL,
    basic: process.env.NEXT_PUBLIC_KIWIFY_BASIC_URL,
    videochamada: process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL,
    limpeza: process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL,
  };
  return map[plan as Exclude<PlanId, "pergunta1" | "pergunta3" | "pergunta7">];
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
