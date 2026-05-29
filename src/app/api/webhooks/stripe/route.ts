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

    // Confere se user ja existia ANTES de update (pra decidir mandar welcome ou nao)
    const { data: existingUser } = await admin
      .from("users")
      .select("id, plan")
      .eq("email", email)
      .maybeSingle();

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

    // Welcome email EN — cliente intl paga via Stripe e nao recebia nada antes
    // (so o Stripe receipt automatico). Espelha o que webhook Kiwify faz mas em EN.
    if (!existingUser) {
      const subFirstName = name ? name.split(" ")[0] : "dear soul";
      const subAccessLink = `${getSiteUrl(req)}/cadastro?email=${encodeURIComponent(email)}`;
      const subProductName =
        plan === "premium" ? "Full Consultation with ATB" : "Basic Plan";
      // Preco amigavel: amountTotal vem em cents, currency pode ser usd/eur/jpy
      const cur = currency.toUpperCase();
      const subPriceLabel = (() => {
        if (cur === "JPY") return `¥${amountTotal}/month`;
        const v = (amountTotal / 100).toFixed(0);
        if (cur === "USD") return `$${v}/month`;
        if (cur === "EUR") return `€${v}/month`;
        if (cur === "GBP") return `£${v}/month`;
        return `${cur} ${v}/month`;
      })();

      const subHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040,#2a0055,#1e0040);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">💛</div>
      <h1 style="color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;">Welcome to ${escapeHtml(subProductName)}</h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;">
        Hi <strong style="color:#f5c860;">${escapeHtml(subFirstName)}</strong>! Your subscription is active. ATB is ready to talk to you.
      </p>
      <p style="color:#c4b5fd;font-size:16px;line-height:1.65;margin:0 0 24px;">
        ${escapeHtml(subPriceLabel)} · Cancel anytime · Charged via Stripe
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.65;margin:0 0 22px;">
        Press the gold button to create your account in 30 seconds and start your reading:
      </p>
      <a href="${subAccessLink}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;">✨ Talk to ATB now</a>
    </div>
    <div style="background:linear-gradient(135deg,rgba(232,184,75,0.22),rgba(232,184,75,0.08));border:2px solid rgba(232,184,75,0.6);border-radius:14px;padding:20px;margin-top:20px;">
      <p style="color:#e8b84b;font-size:18px;font-weight:800;margin:0 0 8px;">⚠️ IMPORTANT — USE THIS EMAIL</p>
      <p style="color:#fbf8ff;font-size:16px;line-height:1.6;margin:0;">
        Create your account with the <strong style="color:#e8b84b;">same email used in your Stripe payment:</strong><br/>
        <strong style="color:#f5c860;font-size:18px;">${escapeHtml(email)}</strong>
      </p>
      <p style="color:#c4b5fd;font-size:13px;line-height:1.55;margin:14px 0 0;font-style:italic;">
        If you use a different email, your subscription won't unlock your account.
      </p>
    </div>
    <p style="color:#9575cd;font-size:13px;text-align:center;margin-top:24px;line-height:1.5;">
      For entertainment and spiritual guidance purposes only. Not a substitute for professional medical, psychological, or financial advice. 18+.
    </p>
  </div>
</body></html>`;
      await sendCustomerEmailWithLog({
        scope: "webhook.stripe.subscription",
        to: email,
        subject: `💛 Welcome to ${subProductName} — your access is ready`,
        html: subHtml,
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

    // ⚠️ MAGIC-LINK 1-CLIQUE EN — cliente intl paga via Stripe e nao tinha
    // jeito de entrar sem criar senha (mesmo problema do Kiwify pre-fix).
    // admin.generateLink cria user se nao existir e gera token OTP.
    let magicUrl = `${getSiteUrl(req)}/obrigado-pergunta?email=${encodeURIComponent(email)}`;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
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

    const pFirstName = name ? name.split(" ")[0] : "dear soul";
    const cLabel = credits === 1 ? "1 question" : `${credits} questions`;
    const pHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">✨</div>
      <h1 style="color:#e8b84b;font-size:32px;margin:0 0 12px;line-height:1.15;">Your ${cLabel} is ready</h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
        Hi <strong style="color:#f5c860;">${escapeHtml(pFirstName)}</strong>! Payment confirmed. ATB is ready to answer.
      </p>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 28px;font-weight:600;">
        Tap the gold button below. You go straight to the chat.<br>
        <strong style="color:#e8b84b;">No password needed — this link signs you in.</strong>
      </p>
      <a href="${magicUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:22px;padding:22px 38px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
        ✨ Enter now with 1 tap
      </a>
      <p style="color:#c4b5fd;font-size:14px;margin:18px 0 0;line-height:1.5;">
        This link signs you in instantly. If you had an account before, you're back in. If not, ATB just created one for you.
      </p>
    </div>

    <div style="background:rgba(126,232,248,0.08);border:1.5px solid rgba(126,232,248,0.3);border-radius:14px;padding:20px;margin-top:20px;text-align:left;">
      <p style="color:#7ee8f8;font-size:16px;font-weight:700;margin:0 0 8px;">💡 If the button doesn't work</p>
      <p style="color:#fbf8ff;font-size:15px;line-height:1.6;margin:0;font-weight:500;">
        Copy this link and paste it in your browser:<br>
        <span style="color:#c4b5fd;font-size:12px;word-break:break-all;">${escapeHtml(magicUrl)}</span>
      </p>
      <p style="color:#c4b5fd;font-size:14px;line-height:1.6;margin:12px 0 0;">
        Or just reply to this email — I, ATB, read every message personally.
      </p>
    </div>

    <div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:14px;line-height:1.6;font-style:italic;">
      I'm here, dear soul.
    </div>
  </div>
</body></html>`;
    await sendCustomerEmailWithLog({
      scope: "webhook.stripe.pergunta",
      to: email,
      subject: `✨ Your ${cLabel} with ATB is ready — enter with 1 tap`,
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

    // Welcome email EN pra videochamada US — cliente paga US$497 e precisa saber
    // que vai receber link Zoom/Meet em ate 24h (gerado manualmente por enquanto)
    const vFirstName = name ? name.split(" ")[0] : "dear soul";
    const cur = currency.toUpperCase();
    const vPriceLabel = (() => {
      if (cur === "JPY") return `¥${amountTotal}`;
      const v = (amountTotal / 100).toFixed(0);
      if (cur === "USD") return `$${v}`;
      if (cur === "EUR") return `€${v}`;
      if (cur === "GBP") return `£${v}`;
      return `${cur} ${v}`;
    })();
    const vHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040,#2a0055,#1e0040);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">📞</div>
      <h1 style="color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;">Your Live Video Session is Booked</h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;">
        Hi <strong style="color:#f5c860;">${escapeHtml(vFirstName)}</strong>! Your payment of <strong>${escapeHtml(vPriceLabel)}</strong> is confirmed. ATB is preparing your live spiritual reading.
      </p>
    </div>
    <div style="background:linear-gradient(135deg,rgba(232,184,75,0.22),rgba(232,184,75,0.08));border:2px solid rgba(232,184,75,0.6);border-radius:14px;padding:24px 22px;margin-top:20px;">
      <h2 style="color:#e8b84b;font-size:20px;margin:0 0 12px;">📅 Next steps</h2>
      <ol style="color:#fbf8ff;font-size:16px;line-height:1.7;padding-left:22px;margin:0;">
        <li><strong style="color:#f5c860;">Within 24 hours</strong>, ATB will email you a private Zoom or Google Meet link with a few date/time options.</li>
        <li>You reply choosing the slot that works best for you.</li>
        <li>On the scheduled day, click the video link — your private 1-hour session begins.</li>
      </ol>
    </div>
    <div style="background:rgba(126,232,248,0.10);border:1px solid rgba(126,232,248,0.3);border-radius:12px;padding:18px;margin-top:16px;">
      <p style="color:#7ee8f8;font-size:15px;line-height:1.6;margin:0;">
        💬 Need to reach ATB? Reply directly to this email — she'll see it personally.
      </p>
    </div>
    <p style="color:#9575cd;font-size:13px;text-align:center;margin-top:24px;line-height:1.5;">
      For entertainment and spiritual guidance purposes only. Not a substitute for professional medical, psychological, or financial advice. 18+.
    </p>
  </div>
</body></html>`;
    await sendCustomerEmailWithLog({
      scope: "webhook.stripe.videochamada",
      to: email,
      subject: `📞 Your live video session with ATB is booked`,
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
