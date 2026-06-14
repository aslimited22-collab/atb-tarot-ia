// Cliente Stripe usado APENAS no checkout internacional da Limpeza V2.
// Kiwify continua sendo o provider principal (BR).
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return _stripe;
}

// Detecta se o pais NAO e Brasil (-> oferecer Stripe).
// Vercel injeta x-vercel-ip-country (codigo ISO de 2 letras).
// Fallback: Accept-Language (pt-BR / en-US / etc).
export function detectIsInternational(req: Request): boolean {
  const country = req.headers.get("x-vercel-ip-country") || "";
  if (country) return country.toUpperCase() !== "BR";

  // Fallback: Accept-Language
  const lang = (req.headers.get("accept-language") || "").toLowerCase();
  if (lang.includes("pt-br") || lang.startsWith("pt")) return false;
  return true;
}

export type SupportedCurrency = "usd" | "brl" | "eur" | "jpy";

/**
 * Mapeia moeda + valor a partir do request.
 * Regras:
 *  - x-vercel-ip-country=BR ou pt-BR → BRL R$97
 *  - accept-language es/de/it/fr → EUR €18
 *  - accept-language ja → JPY ¥2900
 *  - default international → USD $19
 * Valores configuráveis via env (LIMPEZA_V2_PRICE / _USD / _EUR / _JPY).
 */
export function currencyForRequest(req: Request): {
  currency: SupportedCurrency;
  amount: number;
  isInternational: boolean;
  locale: string;
} {
  const country = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const lang = (req.headers.get("accept-language") || "").toLowerCase();

  // BRL/Kiwify SÓ quando o geo é Brasil, OU quando não há geo e o idioma é
  // português (proteção BR-first pra caso ambíguo). Geo explícito de país
  // lusófono não-BR (PT/AO/MZ) NÃO cai em BRL — Portugal paga EUR no Stripe,
  // não é jogado no checkout brasileiro. (Idioma do site segue inalterado.)
  const isPtLang = lang.includes("pt-br") || lang.startsWith("pt");
  if (country === "BR" || (country === "" && isPtLang)) {
    return {
      currency: "brl",
      amount: Number(process.env.LIMPEZA_V2_PRICE || 97),
      isInternational: false,
      locale: "pt-BR",
    };
  }

  // Japão / japonês
  if (country === "JP" || lang.startsWith("ja")) {
    return {
      currency: "jpy",
      amount: Number(process.env.LIMPEZA_V2_PRICE_JPY || 2900),
      isInternational: true,
      locale: "ja",
    };
  }

  // Eurozone (idiomas europeus comuns)
  const EUROZONE_LANGS = ["es", "de", "it", "fr", "nl", "pt-pt"];
  const EUROZONE_COUNTRIES = ["ES", "DE", "IT", "FR", "NL", "PT", "AT", "BE", "IE", "FI", "GR"];
  const isEurozone = EUROZONE_COUNTRIES.includes(country) ||
    EUROZONE_LANGS.some((l) => lang.startsWith(l));
  if (isEurozone) {
    let locale = "en";
    if (lang.startsWith("es")) locale = "es";
    else if (lang.startsWith("de")) locale = "de";
    else if (lang.startsWith("it")) locale = "it";
    return {
      currency: "eur",
      amount: Number(process.env.LIMPEZA_V2_PRICE_EUR || 18),
      isInternational: true,
      locale,
    };
  }

  // Default international: USD
  return {
    currency: "usd",
    amount: Number(process.env.LIMPEZA_V2_PRICE_USD || 19),
    isInternational: true,
    locale: "en",
  };
}

// Compat com código antigo
export function detectIsInternationalLegacy(req: Request): boolean {
  return currencyForRequest(req).isInternational;
}

export type CheckoutSessionInput = {
  orderId: string;
  email: string;
  name: string;
  amount: number;       // em unidades inteiras (97 reais, 19 dolares)
  currency: SupportedCurrency;
  successUrl: string;
  cancelUrl: string;
  userId?: string;      // opcional: liga compra a um user_id no Supabase
  locale?: string;
};

// JPY não tem decimais — Stripe espera unit_amount já em yens inteiros.
// Outras moedas (USD/EUR/BRL) precisam multiplicar por 100 (centavos).
function toMinorUnits(amount: number, currency: SupportedCurrency): number {
  if (currency === "jpy") return Math.round(amount);
  return Math.round(amount * 100);
}

// Mapeia locale Stripe (pt-BR/en/es/de/it/ja) — Stripe aceita literais específicos.
// Tipo é cast pra `any` pra evitar incompat com versões diferentes do SDK.
function stripeLocale(locale?: string): any {
  const l = (locale || "").toLowerCase();
  if (l.startsWith("pt")) return "pt-BR";
  if (l.startsWith("es")) return "es";
  if (l.startsWith("de")) return "de";
  if (l.startsWith("it")) return "it";
  if (l.startsWith("ja")) return "ja";
  if (l.startsWith("fr")) return "fr";
  if (l.startsWith("nl")) return "nl";
  return "auto";
}

/**
 * Cria sessão de checkout Stripe.
 * - Se LIMPEZA_V2_PRICE_USD começar com "price_" → usa price ID Stripe pré-criado
 * - Senão → cria price_data inline (não precisa cadastrar produto no Stripe)
 *
 * Aceita também user_id como metadata pra fluxos com auth.
 */
export async function createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string; id: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const envPriceId = process.env.LIMPEZA_V2_PRICE_USD || "";
  const usePriceId = envPriceId.startsWith("price_") && input.currency === "usd";

  const lineItem: any = usePriceId
    ? { quantity: 1, price: envPriceId }
    : {
        quantity: 1,
        price_data: {
          currency: input.currency,
          unit_amount: toMinorUnits(input.amount, input.currency),
          product_data: {
            name: input.currency === "brl"
              ? "Limpeza Espiritual com ATB"
              : "Spiritual Cleansing by ATB",
            description: input.currency === "brl"
              ? "Orientação espiritual personalizada da ATB."
              : "Personalized spiritual reading and cleansing guidance.",
          },
        },
      };

  const metadata: Record<string, string> = {
    order_id: input.orderId,
    product_type: "limpeza_espiritual",
  };
  if (input.userId) metadata.user_id = input.userId;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    locale: stripeLocale(input.locale || input.currency),
    customer_email: input.email,
    client_reference_id: input.orderId,
    metadata,
    line_items: [lineItem],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    billing_address_collection: "auto",
  });

  return session.url ? { url: session.url, id: session.id } : null;
}
