import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileChatCredits } from "@/lib/reconcileCredits";
import { getStripe } from "@/lib/stripe";
import { deliverLimpezaOrder, sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";
import { buildWelcomeEmail } from "@/lib/welcome-email";
import { buyerLocale } from "@/lib/i18n/locales";

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const runtime = "nodejs";
// Stripe envia o body cru; nao podemos parsear como JSON antes da verificacao.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 500 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "missing webhook secret" }, { status: 500 });
  }

  // Body cru (text) p/ verificar assinatura
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `signature verification failed: ${err?.message}` }, { status: 400 });
  }

  // Processa apenas eventos relevantes do checkout
  // Cancelamento / refund -> marca order como cancelled e remove plan ativo
  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "charge.refunded" ||
    event.type === "checkout.session.expired"
  ) {
    const obj = event.data.object as any;
    const orderIdRef: string | undefined =
      obj.client_reference_id ||
      obj.metadata?.order_id ||
      obj.subscription_details?.metadata?.order_id;
    const customerEmail: string = (obj.customer_email || obj.receipt_email || obj.customer_details?.email || "").toLowerCase();

    if (orderIdRef && /^[0-9a-f-]{36}$/i.test(orderIdRef)) {
      const adminCancel = createAdminClient();
      await adminCancel
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderIdRef);
      // Tenta tambem desativar plano do user no Supabase (compat com fluxos com active flag)
      if (customerEmail) {
        await adminCancel
          .from("users")
          .update({ plan: "free" })
          .eq("email", customerEmail);
      }
      return NextResponse.json({ ok: true, cancelled: orderIdRef });
    }
    return NextResponse.json({ ok: true, ignored: "no order_id" });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object as any;
  const plan: string | undefined = session.metadata?.plan; // "premium" | "basic" | "videochamada" | "limpeza" | undefined
  const orderId: string | undefined = session.client_reference_id || session.metadata?.order_id;
  const email: string = (session.customer_details?.email || session.customer_email || "").toLowerCase();
  const name: string | undefined = session.customer_details?.name;
  const phone: string | undefined = session.customer_details?.phone || session.customer_phone || undefined;
  const amountTotal = Number(session.amount_total || 0); // em cents
  const currency = String(session.currency || "usd").toLowerCase();
  const paymentId = String(session.id || "");
  // Idioma do comprador (país do endereço Stripe + moeda) — pro e-mail e locale.
  const buyerCountry: string | undefined = session.customer_details?.address?.country || undefined;
  const buyerLoc = buyerLocale(buyerCountry, currency);

  const admin = createAdminClient();

  // ---------- BRANCH 1: Plans recorrentes do roteador /api/checkout/[plan] ----------
  // Estes têm session.metadata.plan setado (premium/basic) e NÃO têm order_id (são subscriptions).
  if (plan === "premium" || plan === "basic") {
    if (!email) {
      logWarn("webhook.stripe", "subscription completed without email", { plan, sessionId: paymentId });
      return NextResponse.json({ error: "missing email" }, { status: 400 });
    }
    logInfo("webhook.stripe", "international subscription paid", { plan, email, currency, amountTotal });

    // Confere se user ja existia ANTES (pra decidir mandar welcome ou nao)
    const { data: existingUser } = await admin
      .from("users")
      .select("id, plan")
      .eq("email", email)
      .maybeSingle();

    // Magic-link 1-toque: cria a conta (se nao existir) e loga DIRETO no chat.
    // ORDEM CRITICA: gerar ANTES do update de plan. Senao, p/ assinante NOVO o
    // user ainda nao existe na hora do update -> ficaria pago porem SEM plano e
    // sem conta (foi o caso da cliente premium internacional que pagou e travou).
    let subMagicUrl = `${getSiteUrl(req)}/cadastro?email=${encodeURIComponent(email)}`;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${getSiteUrl(req)}/auth/callback?next=${encodeURIComponent("/dashboard/chat")}` },
      });
      const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;
      if (actionLink) subMagicUrl = actionLink;
    } catch (e) {
      logWarn("webhook.stripe.subscription", "magic-link gen failed", { email, error: String(e) });
    }

    // Atualiza users.plan + idioma real do comprador (país/moeda) — pro e-mail e
    // resgate na língua certa. Agora o user existe (generateLink criou) -> aplica.
    const subPatch: { plan: string; locale?: string } = { plan, locale: buyerLoc };
    const { error: usrErr } = await admin
      .from("users")
      .update(subPatch)
      .eq("email", email);
    if (usrErr) {
      logWarn("webhook.stripe", "users.plan update failed", { plan, email, error: usrErr.message });
    }

    // Espelha em purchases (auditoria)
    await admin.from("purchases").insert({
      email,
      name: name ?? null,
      kiwify_order_id: paymentId, // reusa coluna pra Stripe session id
      plan,
      event: `${plan}_purchased_intl`,
      amount_cents: amountTotal,
      user_id: existingUser?.id ?? null,
    });

    // Welcome email localizado (6 idiomas) com magic-link 1-toque — só pra user
    // novo (assinante recorrente já tem acesso). Idioma = país/moeda do comprador.
    if (!existingUser) {
      const { subject, html } = buildWelcomeEmail({ product: "subscription", locale: buyerLoc, name, magicUrl: subMagicUrl });
      await sendCustomerEmailWithLog({
        scope: "webhook.stripe.subscription",
        to: email,
        subject,
        html,
        refId: paymentId,
      });
    }

    return NextResponse.json({ ok: true, plan, email });
  }

  // ---------- BRANCH 1.5: Pergunta avulsa (créditos one-time) ----------
  // Plans pergunta1 (1 crédito), pergunta3 (3 créditos), pergunta7 (7 créditos).
  // Cliente paga ANTES de criar conta — webhook só grava em purchases.
  // /obrigado-pergunta cria a conta e credita o saldo a partir das purchases.
  if (plan === "pergunta1" || plan === "pergunta3" || plan === "pergunta7") {
    if (!email) {
      logWarn("webhook.stripe", "pergunta paid without email", { plan, sessionId: paymentId });
      return NextResponse.json({ error: "missing email" }, { status: 400 });
    }
    const credits = plan === "pergunta1" ? 1 : plan === "pergunta3" ? 3 : 7;
    // Email SEMPRE em minúsculas pras operações de DB — purchases/users são
    // gravados/casados em lowercase (igual ao Kiwify e ao reconcileCredits).
    // Sem isto, email com maiúscula gravava purchase que o reconcile não achava.
    const emailLc = email.toLowerCase();
    logInfo("webhook.stripe", "pergunta avulsa paid intl", { plan, email: emailLc, currency, amountTotal, credits });

    // Se já existe user, credita direto
    const { data: userRow } = await admin
      .from("users")
      .select("id, chat_credits_balance, chat_credits_total_purchased")
      .eq("email", emailLc)
      .maybeSingle();

    if (userRow) {
      const newBalance = (userRow.chat_credits_balance ?? 0) + credits;
      const newTotal = (userRow.chat_credits_total_purchased ?? 0) + credits;
      await admin
        .from("users")
        .update({
          chat_credits_balance: newBalance,
          chat_credits_total_purchased: newTotal,
        })
        .eq("id", userRow.id);
    }

    await admin.from("purchases").insert({
      email: emailLc,
      name: name ?? null,
      kiwify_order_id: paymentId, // reusa coluna pra Stripe session id
      plan,
      event: `${plan}_purchased_intl`,
      amount_cents: amountTotal,
      user_id: userRow?.id ?? null,
    });

    // ⚠️ MAGIC-LINK 1-CLIQUE EN — cliente intl paga via Stripe e nao tinha
    // jeito de entrar sem criar senha (mesmo problema do Kiwify pre-fix).
    // admin.generateLink cria user se nao existir e gera token OTP.
    let magicUrl = `${getSiteUrl(req)}/obrigado-pergunta?email=${encodeURIComponent(email)}`;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: emailLc,
        options: {
          redirectTo: `${getSiteUrl(req)}/auth/callback?next=${encodeURIComponent("/dashboard/chat?welcome=pergunta")}`,
        },
      });
      const actionLink = (linkData as { properties?: { action_link?: string } } | null)
        ?.properties?.action_link;
      if (actionLink) magicUrl = actionLink;
    } catch (e) {
      logWarn("webhook.stripe.pergunta", "magic-link gen failed", { email, error: String(e) });
    }

    // Credita JÁ na compra — NÃO espera o cliente clicar no magic-link.
    // generateLink acima garante que o user existe; reconcile aplica o saldo a
    // partir das purchases pergunta. Idempotente. Sem isto, quem não clicava no
    // link ficava com saldo 0 e o chat escondia o input → pagava e não perguntava.
    try {
      const { data: pu } = await admin
        .from("users").select("id").eq("email", emailLc).maybeSingle();
      if (pu?.id) {
        await reconcileChatCredits(admin, pu.id, emailLc);
        // Captura o idioma real do comprador (país/moeda) pré-login — pro e-mail
        // de resgate sair na língua certa mesmo se a cliente nunca logar.
        await admin.from("users").update({ locale: buyerLoc }).eq("id", pu.id);
      }
    } catch (e) {
      logWarn("webhook.stripe.pergunta", "reconcile credits failed", { email, error: String(e) });
    }

    // Welcome email localizado (6 idiomas) com magic-link 1-toque. Idioma =
    // país/moeda do comprador (en/es/de/it/ja, ou pt se for BR via Stripe).
    const { subject: pSubject, html: pHtml } = buildWelcomeEmail({ product: "pergunta", locale: buyerLoc, name, magicUrl });
    await sendCustomerEmailWithLog({
      scope: "webhook.stripe.pergunta",
      to: email,
      subject: pSubject,
      html: pHtml,
      refId: paymentId,
    });

    return NextResponse.json({ ok: true, plan, email, credits });
  }

  // ---------- BRANCH 2: Videochamada one-time intl ----------
  if (plan === "videochamada") {
    if (!email) {
      return NextResponse.json({ error: "missing email" }, { status: 400 });
    }
    logInfo("webhook.stripe", "videochamada paid intl", { email, currency, amountTotal });

    await admin.from("purchases").insert({
      email,
      name: name ?? null,
      kiwify_order_id: paymentId,
      plan: "videochamada",
      event: "videochamada_purchased_intl",
      amount_cents: amountTotal,
      user_id: null,
    });

    // Magic-link 1-toque: cria a conta e loga no painel. Assim o cliente intl
    // tem conta + acesso (antes ficava so esperando o e-mail do Zoom). O painel
    // /dashboard/videochamada nao existe — manda pro hub /dashboard.
    let vMagicUrl = `${getSiteUrl(req)}/dashboard`;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${getSiteUrl(req)}/auth/callback?next=${encodeURIComponent("/dashboard")}` },
      });
      const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;
      if (actionLink) vMagicUrl = actionLink;
    } catch (e) {
      logWarn("webhook.stripe.videochamada", "magic-link gen failed", { email, error: String(e) });
    }

    // Captura o idioma do comprador no user (criado pelo generateLink acima).
    try { await admin.from("users").update({ locale: buyerLoc }).eq("email", email); } catch {}

    // Welcome email localizado (6 idiomas) com magic-link 1-toque + aviso do Zoom em 24h.
    const { subject: vSubject, html: vHtml } = buildWelcomeEmail({ product: "videochamada", locale: buyerLoc, name, magicUrl: vMagicUrl });
    await sendCustomerEmailWithLog({
      scope: "webhook.stripe.videochamada",
      to: email,
      subject: vSubject,
      html: vHtml,
      refId: paymentId,
    });

    return NextResponse.json({ ok: true, plan: "videochamada", email });
  }

  // ---------- BRANCH 3 (fluxo legado): Limpeza V2 com order UUID ----------
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    logWarn("webhook.stripe", "missing/invalid order_id (and no recognized plan)", { orderId, plan, eventId: event.id });
    return NextResponse.json({ error: "missing/invalid order_id" }, { status: 400 });
  }

  logInfo("webhook.stripe", "checkout.session.completed received (limpeza)", {
    orderId,
    eventId: event.id,
    amountTotal,
    currency,
    hasPhone: !!phone,
  });

  const { data: v2Order, error: orderErr } = await admin
    .from("orders")
    .select("id, status, email, name, phone, locale, product_type")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr) {
    logError("webhook.stripe", "supabase select error", { orderId, error: orderErr.message });
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  if (!v2Order || v2Order.product_type !== "limpeza_espiritual") {
    logWarn("webhook.stripe", "order not found", { orderId });
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  const wasAlreadyPaid = v2Order.status === "paid";

  // Marca paid + payment_id e ATUALIZA phone se Stripe trouxer (caso form não tenha)
  const paidPatch: Record<string, any> = {
    status: "paid",
    payment_id: paymentId,
    payment_provider: "stripe",
  };
  if (phone && !v2Order.phone) paidPatch.phone = phone;

  const { error: updErr } = await admin.from("orders").update(paidPatch).eq("id", v2Order.id);
  if (updErr) {
    logError("webhook.stripe", "could not mark order paid", { orderId, error: updErr.message });
    // Não retorna erro: tentamos ainda assim entregar
  } else {
    logInfo("webhook.stripe", "order marked paid", { orderId, wasAlreadyPaid });
  }

  // Espelha em purchases (admin antigo) — não falha o fluxo se der erro
  const { error: purErr } = await admin.from("purchases").insert({
    email: (v2Order.email || email).toLowerCase(),
    name: v2Order.name ?? name ?? null,
    kiwify_order_id: paymentId,
    plan: "limpeza_v2_intl",
    event: "limpeza_v2_purchased_intl",
    amount_cents: amountTotal,
    user_id: null,
  });
  if (purErr) {
    logWarn("webhook.stripe", "purchases insert failed", { orderId, error: purErr.message });
  }

  // Pipeline unificado de entrega (geração + email + Z-API + status)
  if (!wasAlreadyPaid) {
    const baseUrl = getSiteUrl(req);

    const result = await deliverLimpezaOrder({
      orderId: v2Order.id,
      email: (v2Order.email || email).toLowerCase(),
      name: v2Order.name ?? name,
      phone: v2Order.phone || phone || null,
      locale: v2Order.locale,
      deliveryLink: `${baseUrl}/entrega/${v2Order.id}`,
      internalGenUrl: `${baseUrl}/api/limpeza/generate`,
      triggerGeneration: true,
    });

    logInfo("webhook.stripe", "delivery pipeline result", {
      orderId,
      finalDeliveryStatus: result.finalDeliveryStatus,
      gen: result.generation.ok,
      email: result.email.ok,
      wa: result.whatsapp.ok,
    });
  }

  return NextResponse.json({ ok: true, plan: "limpeza_v2_intl", orderId: v2Order.id });
}
