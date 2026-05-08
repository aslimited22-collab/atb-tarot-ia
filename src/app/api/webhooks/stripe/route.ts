import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { Resend } from "resend";

export const runtime = "nodejs";
// Stripe envia o body cru; nao podemos parsear como JSON antes da verificacao.
export const dynamic = "force-dynamic";

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

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
  const orderId: string | undefined = session.client_reference_id || session.metadata?.order_id;
  const email: string = (session.customer_details?.email || session.customer_email || "").toLowerCase();
  const name: string | undefined = session.customer_details?.name;
  const amountTotal = Number(session.amount_total || 0); // em cents
  const currency = String(session.currency || "usd").toLowerCase();
  const paymentId = String(session.id || "");

  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json({ error: "missing/invalid order_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: v2Order } = await admin
    .from("orders")
    .select("id, status, email, name, product_type")
    .eq("id", orderId)
    .maybeSingle();

  if (!v2Order || v2Order.product_type !== "limpeza_espiritual") {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  const wasAlreadyPaid = v2Order.status === "paid";

  // Marca paid + payment_id
  await admin
    .from("orders")
    .update({
      status: "paid",
      payment_id: paymentId,
      payment_provider: "stripe",
    })
    .eq("id", v2Order.id);

  // Espelha em purchases (admin antigo)
  await admin.from("purchases").insert({
    email: (v2Order.email || email).toLowerCase(),
    name: v2Order.name ?? name ?? null,
    kiwify_order_id: paymentId,
    plan: "limpeza_v2_intl",
    event: "limpeza_v2_purchased_intl",
    amount_cents: amountTotal,
    user_id: null,
  });

  // Dispara geração completa
  try {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || "atbtartot.com";
    await fetch(`${proto}://${host}/api/limpeza/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": process.env.INTERNAL_GEN_TOKEN || "",
      },
      body: JSON.stringify({ orderId: v2Order.id }),
    });
  } catch {
    // Fail-open: idempotente; cliente pode disparar a geração ao abrir /entrega
  }

  // Email pra cliente (apenas na primeira aprovação)
  if (process.env.RESEND_API_KEY && !wasAlreadyPaid) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const firstName = (v2Order.name || name || "querida alma").split(" ")[0];
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("host") || "atbtartot.com";
      const deliveryLink = `${proto}://${host}/entrega/${v2Order.id}`;

      const isPt = currency === "brl";
      const subject = isPt ? "🕊️ Sua Limpeza Espiritual está pronta" : "🕊️ Your Spiritual Cleansing is ready";
      const greeting = isPt ? `Olá, <strong style="color:#f5c860;">${escapeHtml(firstName)}</strong>!<br>A ATB preparou uma orientação espiritual para você.` :
        `Hello, <strong style="color:#f5c860;">${escapeHtml(firstName)}</strong>!<br>ATB has prepared a personal spiritual reading for you.`;
      const cta = isPt ? "✨ Ver minha Limpeza" : "✨ Open my Cleansing";
      const note = isPt ? "Guarde este email. Você pode acessar pelo botão acima quando quiser." :
        "Save this email. You can open the link above any time.";

      await resend.emails.send({
        from: fromEmail,
        to: (v2Order.email || email).toLowerCase(),
        subject,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
<div style="max-width:560px;margin:0 auto;padding:30px 20px;">
  <div style="background:linear-gradient(135deg,#1e0040,#2a0055,#1e0040);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.4);">
    <div style="font-size:64px;margin-bottom:16px;">🕊️</div>
    <h1 style="font-family:Georgia,serif;color:#e8b84b;font-size:30px;margin:0 0 12px;line-height:1.15;">${isPt ? "Sua Limpeza está pronta" : "Your Cleansing is ready"}</h1>
    <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;">${greeting}</p>
    <a href="${deliveryLink}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;box-shadow:0 8px 24px rgba(232,184,75,0.4);">${cta}</a>
    <p style="color:#c4b5fd;font-size:13px;margin:24px 0 0;">${note}</p>
  </div>
</div></body></html>`,
      });
    } catch {}
  }

  return NextResponse.json({ ok: true, plan: "limpeza_v2_intl", orderId: v2Order.id });
}
