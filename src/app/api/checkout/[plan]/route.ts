// GET /api/checkout/[plan]
// Roteador dinâmico de checkout.
//
// Plans tradicionais (premium, basic, videochamada, limpeza):
//   BR (x-vercel-ip-country=BR) → 307 redirect pra Kiwify URL (envs)
//   Intl → cria Stripe Checkout session em USD/EUR/JPY e 303 redirect pra session.url
//
// Plans avulsos (pergunta1, pergunta3, pergunta7):
//   SEMPRE Stripe (Kiwify não tem API pública de criar produto).
//   BR → Stripe BRL com payment_method_types Pix + cartão (boleto opcional)
//   Intl → Stripe USD/EUR/JPY só cartão
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
  isPerguntaPlan,
} from "@/lib/pricing";
import { getSiteUrl } from "@/lib/site-url";
import { logInfo, logWarn, logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const isPergunta = isPerguntaPlan(plan);

  // ---------- BRANCH 1: plans tradicionais + BR → Kiwify ----------
  // Pergunta avulsa (pergunta1/3/7) NÃO usa Kiwify (sem API), vai direto pro Stripe abaixo.
  if (!isIntl && !isPergunta) {
    const url = kiwifyUrlFor(plan);
    if (!url) {
      logWarn("checkout", "kiwify url missing for plan", { plan });
      return NextResponse.redirect(`${baseUrl}/#planos`, 307);
    }
    logInfo("checkout", "routing BR → Kiwify", { plan });
    return NextResponse.redirect(url, 307);
  }

  // ---------- BRANCH 2: Stripe Checkout session (intl + todos os pergunta1/3/7) ----------
  const stripe = getStripe();
  if (!stripe) {
    logError("checkout", "Stripe not configured (missing STRIPE_SECRET_KEY)", { plan });
    return NextResponse.redirect(`${baseUrl}/#planos?error=stripe_unavailable`, 307);
  }

  // Pergunta BR: força currency=BRL + Pix/cartão. Outros casos: usa detecção normal.
  let currency: "brl" | "usd" | "eur" | "jpy";
  let locale: string;
  if (isPergunta && !isIntl) {
    currency = "brl";
    locale = "pt-BR";
  } else {
    const detected = currencyForRequest(req);
    currency = detected.currency;
    locale = detected.locale;
  }

  const amount = PLAN_PRICES[plan][currency];
  if (!amount) {
    logError("checkout", "no price for currency", { plan, currency });
    return NextResponse.redirect(`${baseUrl}/#planos?error=no_price`, 307);
  }

  // Defesa em profundidade pro PATH INTL (não-pergunta): Stripe nunca cobra BRL
  // sem ser BR. Pergunta BR é a única exceção legítima (intencional).
  if (currency === "brl" && !isPergunta) {
    logWarn("checkout", "currency=brl detected in intl path — falling back to Kiwify", {
      plan,
      ipCountry: req.headers.get("x-vercel-ip-country"),
      acceptLanguage: req.headers.get("accept-language"),
    });
    const kiwifyUrl = kiwifyUrlFor(plan);
    if (kiwifyUrl) return NextResponse.redirect(kiwifyUrl, 307);
    return NextResponse.redirect(`${baseUrl}/#planos`, 307);
  }

  const isSubscription = PLAN_TYPE[plan] === "subscription";

  // payment_method_types:
  // - BR pergunta avulsa (BRL): Pix + cartão (Pix exige currency=brl + mode=payment)
  // - Outros intl/subscription: só cartão
  const paymentMethodTypes: string[] =
    isPergunta && currency === "brl"
      ? ["card", "pix"]
      : ["card"];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: paymentMethodTypes as any,
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
      success_url: isPergunta
        ? `${baseUrl}/obrigado-pergunta?session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/dashboard?welcome=${plan}`,
      cancel_url: isPergunta ? `${baseUrl}/#pergunta` : `${baseUrl}/#planos`,
      billing_address_collection: "auto",
      metadata: {
        plan,
        source: isPergunta && !isIntl ? "br_pergunta" : "international",
        locale,
        currency,
      },
    });

    if (!session.url) {
      logError("checkout", "stripe returned session without url", { plan, sessionId: session.id });
      return NextResponse.redirect(`${baseUrl}/#planos?error=session_no_url`, 307);
    }

    logInfo("checkout", "creating Stripe session", {
      plan,
      currency,
      amount,
      paymentMethods: paymentMethodTypes.join(","),
      ipCountry: req.headers.get("x-vercel-ip-country"),
      acceptLanguage: req.headers.get("accept-language"),
      sessionId: session.id,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    logError("checkout", "stripe session.create failed", {
      plan,
      currency,
      paymentMethods: paymentMethodTypes.join(","),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(`${baseUrl}/#planos?error=stripe_session_failed`, 307);
  }
}
