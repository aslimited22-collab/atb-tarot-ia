// GET /api/checkout/[plan]
// Roteador dinâmico de checkout — decide entre Kiwify (BR) e Stripe (intl) por IP.
//
// Mesmo link público continua funcionando: o usuário clica no botão "Premium"
// na landing e cai aqui. Server-side decide pra onde redirecionar.
//
// Plans suportados: premium, basic, videochamada, limpeza
// - Premium/Basic → subscription mensal (recurring)
// - Videochamada/Limpeza → one-time payment
//
// BR (x-vercel-ip-country=BR) → redirect 307 pra Kiwify URL (envs)
// Intl → cria Stripe Checkout session e redirect 303 pra session.url

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

export async function GET(
  req: Request,
  { params }: { params: { plan: string } }
) {
  const planParam = (params.plan || "").toLowerCase();
  const baseUrl = getSiteUrl(req);

  // Validação básica do plano
  if (!isValidPlan(planParam)) {
    logWarn("checkout", "invalid plan", { plan: planParam });
    return NextResponse.redirect(`${baseUrl}/#planos`, 307);
  }
  const plan = planParam;

  // ---------- BRANCH BR — redirect direto pra Kiwify ----------
  const isIntl = detectIsInternational(req);
  if (!isIntl) {
    const url = kiwifyUrlFor(plan);
    if (!url) {
      logWarn("checkout", "kiwify url missing for plan", { plan });
      return NextResponse.redirect(`${baseUrl}/#planos`, 307);
    }
    logInfo("checkout", "routing BR → Kiwify", { plan });
    return NextResponse.redirect(url, 307);
  }

  // ---------- BRANCH INTL — Stripe Checkout session inline ----------
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

  const isSubscription = PLAN_TYPE[plan] === "subscription";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: ["card"], // SEM Pix/boleto/CPF na experiência intl
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
      },
    });

    if (!session.url) {
      logError("checkout", "stripe returned session without url", { plan, sessionId: session.id });
      return NextResponse.redirect(`${baseUrl}/#planos?error=session_no_url`, 307);
    }

    logInfo("checkout", "routing intl → Stripe", { plan, currency, sessionId: session.id });
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
