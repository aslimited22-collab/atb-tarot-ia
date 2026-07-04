// GET /api/checkout/[plan]
// Roteador dinâmico de checkout — decide entre Kiwify (BR) e Stripe (intl) por IP.
//
// Plans suportados (todos passam por este roteador):
//   premium, basic, videochamada, limpeza, pergunta1, pergunta3, pergunta7
//
// BR (x-vercel-ip-country=BR) → 307 redirect pra Kiwify URL (envs)
// Intl → cria Stripe Checkout session em USD/EUR/JPY e 303 redirect pra session.url
//
// Modes:
//   - Premium/Basic → subscription mensal
//   - Videochamada/Limpeza/Pergunta1/3/7 → payment (one-time)

import { NextResponse } from "next/server";
import { getStripe, currencyForRequest, detectIsInternational } from "@/lib/stripe";
import {
  PLAN_PRICES,
  PLAN_TYPE,
  kiwifyUrlFor,
  planDisplayName,
  stripeLocale,
  isValidPlan,
} from "@/lib/pricing";
import { getSiteUrl } from "@/lib/site-url";
import { logInfo, logWarn, logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Atribuição: lê a origem (utm_*) do cookie first-party `atb_attr` (setado pelo
// AttributionTracker) e repassa ao checkout — pra Kiwify/Stripe atribuírem a venda
// ao canal. PURAMENTE ADITIVO: nunca altera produto/preço/fluxo; qualquer falha
// cai no comportamento original (try/catch).
type Attr = {
  utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string;
  gclid?: string; gbraid?: string; wbraid?: string;
};
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
// Click IDs do Google Ads — repassados na URL do Kiwify pro pixel deles
// carimbar a conversão com o clique do anúncio (atribuição da venda).
const CLICK_KEYS = ["gclid", "gbraid", "wbraid"] as const;
const ALL_KEYS = [...UTM_KEYS, ...CLICK_KEYS] as const;

function getAttribution(req: Request): Attr {
  const out: Attr = {};
  // 1) Query da URL (ex.: link de e-mail com ?utm_source=email&utm_campaign=upsell_x)
  //    tem prioridade — atribui a campanha específica que trouxe o clique.
  try {
    const sp = new URL(req.url).searchParams;
    for (const k of ALL_KEYS) {
      const v = sp.get(k);
      if (v) out[k] = v.slice(0, 150);
    }
  } catch {
    /* ignore */
  }
  // 2) Cookies (first-touch utm em atb_attr; last-touch click ids em atb_gclid)
  //    preenchem o que faltar.
  try {
    const cookie = req.headers.get("cookie") || "";
    for (const [name, keys] of [
      ["atb_attr", UTM_KEYS],
      ["atb_gclid", CLICK_KEYS],
    ] as const) {
      const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
      if (!m) continue;
      const obj = JSON.parse(decodeURIComponent(m[1])) as Record<string, unknown>;
      for (const k of keys) {
        if (!out[k] && typeof obj[k] === "string" && obj[k]) out[k] = (obj[k] as string).slice(0, 150);
      }
    }
  } catch {
    /* ignore */
  }
  // Veio de anúncio (gclid) sem utm na URL → rotula a origem pro painel do
  // Kiwify mostrar de onde veio a venda (o gclid sozinho não aparece lá).
  if (out.gclid && !out.utm_source) {
    out.utm_source = "google";
    out.utm_medium = "cpc";
  }
  return out;
}

function withUtm(rawUrl: string, attr: Attr): string {
  try {
    const u = new URL(rawUrl);
    for (const k of ALL_KEYS) {
      if (attr[k]) u.searchParams.set(k, attr[k]!);
    }
    return u.toString();
  } catch {
    return rawUrl; // nunca quebra o redirect de pagamento
  }
}

export async function GET(
  req: Request,
  { params }: { params: { plan: string } }
) {
  const planParam = (params.plan || "").toLowerCase();
  const baseUrl = getSiteUrl(req);

  if (!isValidPlan(planParam)) {
    logWarn("checkout", "invalid plan", { plan: planParam });
    return NextResponse.redirect(`${baseUrl}/#planos`, 307);
  }
  const plan = planParam;
  const isIntl = detectIsInternational(req);
  const attr = getAttribution(req); // origem (utm) pra atribuir a venda ao canal

  // ---------- BRANCH BR — Kiwify ----------
  if (!isIntl) {
    const url = kiwifyUrlFor(plan);
    if (!url) {
      logWarn("checkout", "kiwify url missing for plan", { plan });
      return NextResponse.redirect(`${baseUrl}/#planos`, 307);
    }
    logInfo("checkout", "routing BR → Kiwify", { plan });
    return NextResponse.redirect(withUtm(url, attr), 307);
  }

  // ---------- BRANCH INTL — Stripe Checkout ----------
  const stripe = getStripe();
  if (!stripe) {
    logError("checkout", "Stripe not configured (missing STRIPE_SECRET_KEY)", { plan });
    return NextResponse.redirect(`${baseUrl}/#planos?error=stripe_unavailable`, 307);
  }

  const { currency, locale } = currencyForRequest(req);
  const amount = PLAN_PRICES[plan][currency];
  if (!amount) {
    logError("checkout", "no price for currency", { plan, currency });
    return NextResponse.redirect(`${baseUrl}/#planos?error=no_price`, 307);
  }

  // Defesa em profundidade: Stripe (path intl) NUNCA cobra BRL.
  // Se por edge case (headers contaminados) detectIsInternational retornou true
  // mas currencyForRequest retornou BRL, força fallback pra Kiwify.
  if (currency === "brl") {
    logWarn("checkout", "currency=brl detected in intl path — falling back to Kiwify", {
      plan,
      ipCountry: req.headers.get("x-vercel-ip-country"),
      acceptLanguage: req.headers.get("accept-language"),
    });
    const kiwifyUrl = kiwifyUrlFor(plan);
    if (kiwifyUrl) return NextResponse.redirect(withUtm(kiwifyUrl, attr), 307);
    return NextResponse.redirect(`${baseUrl}/#planos`, 307);
  }

  const isSubscription = PLAN_TYPE[plan] === "subscription";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: ["card"],
      // Desativa adaptive_pricing pra cliente intl SEMPRE ver preço na moeda original.
      adaptive_pricing: { enabled: false },
      locale: stripeLocale(locale) as any,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: planDisplayName(plan),
            },
            ...(isSubscription
              ? { recurring: { interval: "month" as const } }
              : {}),
          },
        },
      ],
      success_url: `${baseUrl}/dashboard?welcome=${plan}`,
      cancel_url: `${baseUrl}/#planos`,
      billing_address_collection: "auto",
      metadata: {
        plan,
        source: "international",
        locale,
        currency,
        ...attr, // utm_* (quando houver) pra atribuir a venda no Stripe
      },
    });

    if (!session.url) {
      logError("checkout", "stripe returned session without url", { plan, sessionId: session.id });
      return NextResponse.redirect(`${baseUrl}/#planos?error=session_no_url`, 307);
    }

    logInfo("checkout", "creating intl Stripe session", {
      plan,
      currency,
      amount,
      ipCountry: req.headers.get("x-vercel-ip-country"),
      acceptLanguage: req.headers.get("accept-language"),
      sessionId: session.id,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    logError("checkout", "stripe session.create failed", {
      plan,
      currency,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(`${baseUrl}/#planos?error=stripe_session_failed`, 307);
  }
}
