import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { deliverLimpezaOrder, sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";

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

  const admin = createAdminClient();

  // ---------- BRANCH 1: Plans recorrentes do roteador /api/checkout/[plan] ----------
  // Estes têm session.metadata.plan setado (premium/basic) e NÃO têm order_id (são subscriptions).
  if (plan === "premium" || plan === "basic") {
    if (!email) {
      logWarn("webhook.stripe", "subscription completed without email", { plan, sessionId: paymentId });
      return NextResponse.json({ error: "missing email" }, { status: 400 });
    }
    logInfo("webhook.stripe", "international subscription paid", { plan, email, currency, amountTotal });

    // Atualiza users.plan (cria o registro se não existir)
    const { error: usrErr } = await admin
      .from("users")
      .update({ plan })
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
      user_id: null,
    });

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
    logInfo("webhook.stripe", "pergunta avulsa paid intl", { plan, email, currency, amountTotal, credits });

    // Se já existe user, credita direto
    const { data: userRow } = await admin
      .from("users")
      .select("id, chat_credits_balance, chat_credits_total_purchased")
      .eq("email", email)
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
      email,
      name: name ?? null,
      kiwify_order_id: paymentId, // reusa coluna pra Stripe session id
      plan,
      event: `${plan}_purchased_intl`,
      amount_cents: amountTotal,
      user_id: userRow?.id ?? null,
    });

    // Welcome email com link de signup (sem isso o cliente fica perdido)
    const pFirstName = name ? name.split(" ")[0] : "dear soul";
    const pLink = `${getSiteUrl(req)}/obrigado-pergunta?session_id=${encodeURIComponent(paymentId)}`;
    const cLabel = credits === 1 ? "1 question" : `${credits} questions`;
    const pHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040,#2a0055,#1e0040);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">✨</div>
      <h1 style="color:#e8b84b;font-size:32px;margin:0 0 12px;line-height:1.15;">Your ${cLabel} is ready</h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;">
        Hi <strong style="color:#f5c860;">${escapeHtml(pFirstName)}</strong>! Payment confirmed. ATB is ready to answer.
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.65;margin:0 0 28px;">Press the gold button to create your account in 30 seconds:</p>
      <a href="${pLink}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;">✨ Ask my question</a>
    </div>
    <div style="background:linear-gradient(135deg,rgba(232,184,75,0.22),rgba(232,184,75,0.08));border:2px solid rgba(232,184,75,0.6);border-radius:14px;padding:20px;margin-top:20px;">
      <p style="color:#e8b84b;font-size:18px;font-weight:800;margin:0 0 8px;">⚠️ IMPORTANT — USE THIS EMAIL</p>
      <p style="color:#fbf8ff;font-size:16px;line-height:1.6;margin:0;">
        Create your account with the <strong style="color:#e8b84b;">same email used in payment:</strong><br/>
        <strong style="color:#f5c860;font-size:18px;">${escapeHtml(email)}</strong>
      </p>
    </div>
  </div>
</body></html>`;
    await sendCustomerEmailWithLog({
      scope: "webhook.stripe.pergunta",
      to: email,
      subject: `✨ Your ${cLabel} with ATB is ready`,
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
