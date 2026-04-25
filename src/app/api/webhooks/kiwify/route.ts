import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyKiwifySignature, planFromValue } from "@/lib/kiwify";
import { rateLimit, getClientIp } from "@/lib/security";
import { Resend } from "resend";

export const runtime = "nodejs";

// Nonces usados nas últimas 10 minutos — anti replay attack
const usedNonces = new Map<string, number>();
const NONCE_TTL = 10 * 60 * 1000;

// Escapa HTML para evitar injection em emails de notificação
function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanNonces() {
  const now = Date.now();
  for (const [k, t] of usedNonces) {
    if (now - t > NONCE_TTL) usedNonces.delete(k);
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Rate limit: 30 webhooks por IP por minuto
  const rl = rateLimit(`webhook:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  // Limite de tamanho do corpo: 64KB
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 64_000) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const raw = await req.text();

  // Aceita SOMENTE assinatura via query string (padrão Kiwify)
  const url = new URL(req.url);
  const signature = url.searchParams.get("signature");

  if (!verifyKiwifySignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Anti-replay: usar order_id + event como nonce único
  const order = payload.order || payload.Order || payload;
  const event: string = order.webhook_event_type || payload.webhook_event_type || payload.event || payload.type || "";
  const orderId: string | undefined = order.order_id || order.order_ref || payload.order_id;

  if (orderId) {
    cleanNonces();
    const nonceKey = `${orderId}:${event}`;
    if (usedNonces.has(nonceKey)) {
      // Replay detectado — retorna 200 para não reenviar mas ignora
      return NextResponse.json({ ok: true, ignored: "replay" });
    }
    usedNonces.set(nonceKey, Date.now());
  }

  const email: string | undefined =
    order.Customer?.email ||
    order.customer?.email ||
    payload.Customer?.email ||
    payload.customer?.email ||
    payload.email;

  const customerName: string | undefined =
    order.Customer?.full_name ||
    order.Customer?.first_name ||
    order.customer?.full_name ||
    order.customer?.first_name ||
    payload.Customer?.full_name ||
    payload.customer?.full_name;

  const valueCents: number = Number(
    order.Commissions?.charge_amount ??
      order.charge_amount ??
      payload.Commissions?.charge_amount ??
      payload.charge_amount ??
      payload.amount ??
      payload.value ??
      0
  );
  const valueBRL = valueCents > 1000 ? valueCents / 100 : valueCents;

  if (!email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  // Valida formato básico do email antes de usar no banco
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const admin = createAdminClient();

  const productId: string | undefined =
    order.Product?.product_id ||
    order.product?.product_id ||
    payload.Product?.product_id ||
    payload.product?.product_id ||
    payload.product_id;

  const limpezaProductId = process.env.KIWIFY_LIMPEZA_PRODUCT_ID;
  const isLimpezaByProduct = limpezaProductId && productId && productId === limpezaProductId;
  const isLimpezaByValue = !limpezaProductId && valueBRL >= 95 && valueBRL <= 110;

  if ((event === "order.approved" || event === "order_approved") && (isLimpezaByProduct || isLimpezaByValue)) {
    const { data: userRow } = await admin.from("users").select("id").eq("email", email.toLowerCase()).maybeSingle();
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan: "limpeza",
      event: "limpeza_purchased",
      amount_cents: Math.round(valueBRL * 100),
      user_id: userRow?.id ?? null,
    });
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: adminEmail,
        subject: "Nova compra: Limpeza Espiritual",
        html: `<p><strong>Cliente:</strong> ${escapeHtml(customerName) || "Não informado"}</p>
               <p><strong>Email:</strong> ${escapeHtml(email)}</p>
               <p><strong>Produto:</strong> Limpeza Espiritual</p>
               <p><strong>Valor:</strong> R$ ${valueBRL.toFixed(2)}</p>
               <p><strong>Pedido:</strong> ${escapeHtml(orderId) || "N/A"}</p>`,
      });
    }
    return NextResponse.json({ ok: true, plan: "limpeza" });
  }

  if ((event === "order.approved" || event === "order_approved") && valueBRL >= 500) {
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan: "video_call",
      event: "video_call_purchased",
      amount_cents: Math.round(valueBRL * 100),
      user_id: null,
    });
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: adminEmail,
        subject: "Nova compra: Chamada de Vídeo com ATB",
        html: `<p><strong>Cliente:</strong> ${escapeHtml(customerName) || "Não informado"}</p>
               <p><strong>Email:</strong> ${escapeHtml(email)}</p>
               <p><strong>Produto:</strong> Chamada de Vídeo com ATB</p>
               <p><strong>Valor:</strong> R$ ${valueBRL.toFixed(2)}</p>
               <p><strong>Pedido:</strong> ${escapeHtml(orderId) || "N/A"}</p>`,
      });
    }
    return NextResponse.json({ ok: true, plan: "video_call" });
  }

  if (event === "order.approved" || event === "order_approved") {
    const plan = planFromValue(valueBRL);
    const update: Record<string, any> = { plan, kiwify_order_id: orderId ?? null };
    if (customerName && customerName.length <= 100) update.name = customerName;
    await admin.from("users").update(update).eq("email", email.toLowerCase());
    const { data: userRow } = await admin.from("users").select("id").eq("email", email.toLowerCase()).maybeSingle();
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan,
      event,
      amount_cents: valueCents > 0 ? Math.round(valueCents > 1000 ? valueCents : valueCents * 100) : null,
      user_id: userRow?.id ?? null,
    });
    return NextResponse.json({ ok: true, plan });
  }

  if (
    event === "order.refunded" ||
    event === "order_refunded" ||
    event === "subscription.canceled" ||
    event === "subscription_canceled"
  ) {
    await admin.from("users").update({ plan: "free" }).eq("email", email.toLowerCase());
    const { data: userRow } = await admin.from("users").select("id").eq("email", email.toLowerCase()).maybeSingle();
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan: "free",
      event,
      amount_cents: null,
      user_id: userRow?.id ?? null,
    });
    return NextResponse.json({ ok: true, plan: "free" });
  }

  return NextResponse.json({ ok: true, ignored: event });
}
