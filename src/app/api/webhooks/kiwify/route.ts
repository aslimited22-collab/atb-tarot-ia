import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyKiwifySignature, planFromValue } from "@/lib/kiwify";
import { rateLimit, getClientIp } from "@/lib/security";
import { deliverLimpezaOrder, sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

// Anti-replay: nonces persistidos em Supabase (`webhook_nonces`).
// Map em memoria nao funciona em serverless — cada Lambda tem mapa vazio.
async function nonceAlreadyUsed(
  admin: ReturnType<typeof createAdminClient>,
  nonce: string
): Promise<boolean> {
  const { error } = await admin.from("webhook_nonces").insert({ nonce });
  if (!error) return false; // inserido com sucesso → primeira vez
  // Codigo "23505" = unique_violation no Postgres → replay detectado
  if ((error as { code?: string }).code === "23505") return true;
  // Outro erro de DB: nao bloqueia (failope) — mas registra
  logWarn("webhook.kiwify", "nonce table error (failopen)", { error: error.message });
  return false;
}

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

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Rate limit: 30 webhooks por IP por minuto
  const rl = await rateLimit(`webhook:${ip}`, 30, 60_000);
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

  // Anti-replay persistido (Supabase). Cria admin client mais cedo para isso.
  const admin = createAdminClient();
  if (orderId && event) {
    const nonce = `kiwify:${orderId}:${event}`;
    if (await nonceAlreadyUsed(admin, nonce)) {
      logInfo("webhook.kiwify", "replay ignored", { orderId, event });
      return NextResponse.json({ ok: true, ignored: "replay" });
    }
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

  const productId: string | undefined =
    order.Product?.product_id ||
    order.product?.product_id ||
    payload.Product?.product_id ||
    payload.product?.product_id ||
    payload.product_id;

  // ============================================================
  // V2 LIMPEZA — detecta por external_reference (orderId UUID)
  // Roda ANTES da V1 para que pedidos novos (criados via /limpeza)
  // sejam processados pela tabela `orders`/`readings`.
  // ============================================================
  const externalRef: string | undefined =
    order.external_reference ||
    order.externalReference ||
    payload.external_reference ||
    payload.externalReference ||
    new URL(req.url).searchParams.get("external_reference") ||
    undefined;

  const isUuid = (s: string | undefined) => !!s && /^[0-9a-f-]{36}$/i.test(s);

  if ((event === "order.approved" || event === "order_approved") && isUuid(externalRef)) {
    const { data: v2Order, error: v2Err } = await admin
      .from("orders")
      .select("id, status, email, name, phone, locale, product_type")
      .eq("id", externalRef as string)
      .maybeSingle();

    if (v2Err) {
      logError("webhook.kiwify", "v2 order lookup error", { externalRef, error: v2Err.message });
    }

    if (v2Order && v2Order.product_type === "limpeza_espiritual") {
      logInfo("webhook.kiwify", "v2 order matched", {
        orderId: v2Order.id,
        kiwifyOrderId: orderId,
        wasAlreadyPaid: v2Order.status === "paid",
      });

      const wasAlreadyPaid = v2Order.status === "paid";

      // Tenta capturar phone do payload Kiwify (Customer.mobile/phone)
      const kiwifyPhone =
        order.Customer?.mobile ||
        order.Customer?.phone ||
        order.customer?.mobile ||
        order.customer?.phone ||
        payload.Customer?.mobile ||
        payload.customer?.mobile ||
        payload.phone ||
        undefined;

      // Marca paid + payment_id (idempotente)
      const paidPatch: Record<string, any> = {
        status: "paid",
        payment_id: orderId ?? null,
      };
      if (kiwifyPhone && !v2Order.phone) paidPatch.phone = kiwifyPhone;

      const { error: upErr } = await admin
        .from("orders")
        .update(paidPatch)
        .eq("id", v2Order.id);
      if (upErr) {
        logError("webhook.kiwify", "could not mark v2 paid", { orderId: v2Order.id, error: upErr.message });
      }

      // Espelho em purchases
      const { error: purErr } = await admin.from("purchases").insert({
        email: (v2Order.email || email).toLowerCase(),
        name: v2Order.name ?? null,
        kiwify_order_id: orderId ?? "unknown",
        plan: "limpeza_v2",
        event: "limpeza_v2_purchased",
        amount_cents: Math.round(valueBRL * 100),
        user_id: null,
      });
      if (purErr) {
        logWarn("webhook.kiwify", "purchases insert failed", { orderId: v2Order.id, error: purErr.message });
      }

      if (!wasAlreadyPaid) {
        const baseUrl = getSiteUrl(req);

        const result = await deliverLimpezaOrder({
          orderId: v2Order.id,
          email: (v2Order.email || email).toLowerCase(),
          name: v2Order.name ?? customerName,
          phone: v2Order.phone || kiwifyPhone || null,
          locale: v2Order.locale,
          deliveryLink: `${baseUrl}/entrega/${v2Order.id}`,
          internalGenUrl: `${baseUrl}/api/limpeza/generate`,
          triggerGeneration: true,
        });

        logInfo("webhook.kiwify", "v2 delivery pipeline done", {
          orderId: v2Order.id,
          finalDeliveryStatus: result.finalDeliveryStatus,
          gen: result.generation.ok,
          email: result.email.ok,
          wa: result.whatsapp.ok,
        });
      }

      return NextResponse.json({ ok: true, plan: "limpeza_v2", orderId: v2Order.id });
    }
  }

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

    const firstName = customerName ? customerName.split(" ")[0] : "querida alma";
    const accessLink = `${getSiteUrl(req)}/obrigado-limpeza?email=${encodeURIComponent(email.toLowerCase())}`;

    const customerHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.4);">
      <div style="font-size:64px;margin-bottom:16px;">🕊️</div>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#e8b84b;font-size:32px;margin:0 0 12px;line-height:1.15;">
        Sua Limpeza foi recebida
      </h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
        Olá, <strong style="color:#f5c860;">${escapeHtml(firstName)}</strong>!<br>
        Sua compra foi confirmada e os santos já estão preparando sua limpeza sagrada.
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.65;margin:0 0 28px;">
        Aperte no botão dourado abaixo para começar agora. É bem fácil:
      </p>
      <a href="${accessLink}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
        ✨ Acessar minha Limpeza
      </a>
      <p style="color:#c4b5fd;font-size:14px;line-height:1.6;margin:28px 0 0;">
        Ao clicar, você vai criar uma conta com este mesmo email (${escapeHtml(email.toLowerCase())}) ou entrar se já tiver. A sua limpeza estará liberada na hora.
      </p>
    </div>

    <div style="background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.3);border-radius:14px;padding:22px;margin-top:20px;">
      <h2 style="color:#e8b84b;font-size:18px;margin:0 0 12px;font-family:Georgia,serif;">
        ✦ O que vai acontecer agora
      </h2>
      <ol style="color:#fbf8ff;font-size:16px;line-height:1.75;padding-left:22px;margin:0;">
        <li>Aperte o botão "Acessar minha Limpeza"</li>
        <li>Crie sua conta (é só nome, email e uma senha)</li>
        <li>Conte para ATB o que está sentindo</li>
        <li>Receba sua leitura sagrada com a força dos santos</li>
      </ol>
    </div>

    <div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">
      Que Nossa Senhora Aparecida te cubra com seu manto sagrado.<br>
      Que São Miguel te proteja com sua espada divina.<br>
      Estamos com você, minha querida alma. 💛
    </div>

    <div style="text-align:center;margin-top:20px;color:#9575cd;font-size:12px;">
      Pedido: ${escapeHtml(orderId) || "N/A"} · ATB
    </div>
  </div>
</body>
</html>`;

    await sendCustomerEmailWithLog({
      scope: "webhook.kiwify.v1.limpeza",
      to: email.toLowerCase(),
      subject: "🕊️ Sua Limpeza Espiritual está pronta",
      html: customerHtml,
      refId: orderId,
    });

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
    if (adminEmail) {
      await sendCustomerEmailWithLog({
        scope: "webhook.kiwify.v1.limpeza.admin",
        to: adminEmail,
        subject: "💰 Nova venda: Limpeza Espiritual",
        html: `<p><strong>Cliente:</strong> ${escapeHtml(customerName) || "Não informado"}</p>
               <p><strong>Email:</strong> ${escapeHtml(email)}</p>
               <p><strong>Produto:</strong> Limpeza Espiritual</p>
               <p><strong>Valor:</strong> R$ ${valueBRL.toFixed(2)}</p>
               <p><strong>Pedido:</strong> ${escapeHtml(orderId) || "N/A"}</p>
               <p>Email automático com link já enviado para a cliente.</p>`,
        refId: orderId,
      });
    }
    return NextResponse.json({ ok: true, plan: "limpeza" });
  }

  // ESPÍRITO MENTOR (R$ 437) — antes do Vídeo Chamada para precedência
  const espiritoProductId = process.env.KIWIFY_ESPIRITO_PRODUCT_ID;
  const isEspiritoByProduct = espiritoProductId && productId && productId === espiritoProductId;
  const isEspiritoByValue = !espiritoProductId && valueBRL >= 420 && valueBRL <= 460;

  if ((event === "order.approved" || event === "order_approved") && (isEspiritoByProduct || isEspiritoByValue)) {
    const { data: userRow } = await admin.from("users").select("id").eq("email", email.toLowerCase()).maybeSingle();
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan: "espirito",
      event: "espirito_purchased",
      amount_cents: Math.round(valueBRL * 100),
      user_id: userRow?.id ?? null,
    });

    const espFirstName = customerName ? customerName.split(" ")[0] : "querida alma";
    const espAccessLink = `${getSiteUrl(req)}/obrigado-espirito?email=${encodeURIComponent(email.toLowerCase())}`;

    const espCustomerHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">🕯️</div>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#e8b84b;font-size:32px;margin:0 0 12px;line-height:1.15;">
        Seu Espírito Mentor te chama
      </h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
        Olá, <strong style="color:#f5c860;">${escapeHtml(espFirstName)}</strong>!<br>
        Sua sessão espírita está confirmada. Seu guia espiritual já está pronto para te falar.
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.65;margin:0 0 28px;">
        Aperte o botão dourado abaixo para receber sua mensagem do outro lado:
      </p>
      <a href="${espAccessLink}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
        ✨ Falar com meu Espírito Mentor
      </a>
      <p style="color:#c4b5fd;font-size:14px;line-height:1.6;margin:28px 0 0;">
        Ao clicar você cria uma conta com este email (${escapeHtml(email.toLowerCase())}) ou entra se já tiver. Sua sessão fica liberada na hora.
      </p>
    </div>

    <div style="background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.3);border-radius:14px;padding:22px;margin-top:20px;">
      <h2 style="color:#e8b84b;font-size:18px;margin:0 0 12px;font-family:Georgia,serif;">
        ✦ Como vai ser sua sessão
      </h2>
      <ol style="color:#fbf8ff;font-size:16px;line-height:1.75;padding-left:22px;margin:0;">
        <li>Aperte o botão dourado acima</li>
        <li>Crie sua conta (nome, email e senha)</li>
        <li>Conte para ATB quem você quer alcançar do outro lado</li>
        <li>Receba mensagem do seu guia espiritual</li>
      </ol>
    </div>

    <div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">
      Que a luz divina ilumine sua jornada.<br>
      Seu anjo da guarda está com você.<br>
      Estamos aqui, minha querida alma. 💛
    </div>

    <div style="text-align:center;margin-top:20px;color:#9575cd;font-size:12px;">
      Pedido: ${escapeHtml(orderId) || "N/A"} · ATB
    </div>
  </div>
</body>
</html>`;

    await sendCustomerEmailWithLog({
      scope: "webhook.kiwify.v1.espirito",
      to: email.toLowerCase(),
      subject: "🕯️ Seu Espírito Mentor te aguarda",
      html: espCustomerHtml,
      refId: orderId,
    });

    const espAdmin = process.env.ADMIN_NOTIFY_EMAIL;
    if (espAdmin) {
      await sendCustomerEmailWithLog({
        scope: "webhook.kiwify.v1.espirito.admin",
        to: espAdmin,
        subject: "💰 Nova venda: Sessão Espírita Espírito Mentor",
        html: `<p><strong>Cliente:</strong> ${escapeHtml(customerName) || "Não informado"}</p>
               <p><strong>Email:</strong> ${escapeHtml(email)}</p>
               <p><strong>Produto:</strong> Sessão Espírita com Espírito Mentor</p>
               <p><strong>Valor:</strong> R$ ${valueBRL.toFixed(2)}</p>
               <p><strong>Pedido:</strong> ${escapeHtml(orderId) || "N/A"}</p>
               <p>Email automático com link já enviado para a cliente.</p>`,
        refId: orderId,
      });
    }
    return NextResponse.json({ ok: true, plan: "espirito" });
  }

  // VÍDEO CHAMADA (R$ 497) — substituiu o threshold simples >= 500
  const videoProductId = process.env.KIWIFY_VIDEO_PRODUCT_ID;
  const isVideoByProduct = videoProductId && productId && productId === videoProductId;
  const isVideoByValue = !videoProductId && valueBRL >= 470 && valueBRL <= 520;

  if ((event === "order.approved" || event === "order_approved") && (isVideoByProduct || isVideoByValue)) {
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan: "video_call",
      event: "video_call_purchased",
      amount_cents: Math.round(valueBRL * 100),
      user_id: null,
    });
    const videoAdmin = process.env.ADMIN_NOTIFY_EMAIL;
    if (videoAdmin) {
      await sendCustomerEmailWithLog({
        scope: "webhook.kiwify.v1.video.admin",
        to: videoAdmin,
        subject: "Nova compra: Chamada de Vídeo com ATB",
        html: `<p><strong>Cliente:</strong> ${escapeHtml(customerName) || "Não informado"}</p>
               <p><strong>Email:</strong> ${escapeHtml(email)}</p>
               <p><strong>Produto:</strong> Chamada de Vídeo com ATB</p>
               <p><strong>Valor:</strong> R$ ${valueBRL.toFixed(2)}</p>
               <p><strong>Pedido:</strong> ${escapeHtml(orderId) || "N/A"}</p>`,
        refId: orderId,
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
