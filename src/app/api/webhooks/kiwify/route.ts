import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyKiwifySignature, planFromValue } from "@/lib/kiwify";
import { rateLimit, getClientIp } from "@/lib/security";
import { deliverLimpezaOrder, sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";
import { findUserByFuzzyEmail } from "@/lib/user-matching";
import { reconcileChatCredits } from "@/lib/reconcileCredits";

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

  // ─── PERGUNTA AVULSA (créditos one-time: 1/3/7 perguntas) ───
  // Fluxo PRIMÁRIO destes produtos é Stripe (BR usa Pix/cartão).
  // Este branch fica como FALLBACK defensivo caso o user crie manualmente
  // os produtos no Kiwify no futuro — detecta por product_id ou faixa de valor.
  if (event === "order.approved" || event === "order_approved") {
    const p1Id = process.env.KIWIFY_PERGUNTA1_PRODUCT_ID;
    const p3Id = process.env.KIWIFY_PERGUNTA3_PRODUCT_ID;
    const p7Id = process.env.KIWIFY_PERGUNTA7_PRODUCT_ID;

    // Value range SEMPRE como fallback (mesmo com env var setada).
    // Evita misclassificação como "basic" se env var apontar pra produto errado.
    const isP1 = (p1Id && productId === p1Id) || (valueBRL >= 14 && valueBRL <= 16);
    const isP3 = (p3Id && productId === p3Id) || (valueBRL >= 19 && valueBRL <= 21);
    const isP7 = (p7Id && productId === p7Id) || (valueBRL >= 38 && valueBRL <= 41);

    if (isP1 || isP3 || isP7) {
      const credits = isP1 ? 1 : isP3 ? 3 : 7;
      const planKey: "pergunta1" | "pergunta3" | "pergunta7" =
        isP1 ? "pergunta1" : isP3 ? "pergunta3" : "pergunta7";

      // Busca user existente (pode não existir ainda — cliente paga ANTES de criar conta)
      const { data: userRow } = await admin
        .from("users")
        .select("id, chat_credits_balance, chat_credits_total_purchased")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (userRow) {
        // Já tem conta — incrementa direto
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
      // Se NÃO tem conta ainda: a tela /obrigado-pergunta vai criar a conta
      // e creditar a partir das purchases registradas pra esse email.

      await admin.from("purchases").insert({
        email: email.toLowerCase(),
        name: customerName ?? null,
        kiwify_order_id: orderId ?? "unknown",
        plan: planKey,
        event: `${planKey}_purchased`,
        amount_cents: Math.round(valueBRL * 100),
        user_id: userRow?.id ?? null,
      });

      // ⚠️ EMAIL DE BOAS-VINDAS COM MAGIC-LINK — sem senha, sem formulario.
      // Cliente 60+ aperta o botao e cai LOGADO direto no chat.
      // Senha auto-gerada do AutoCreate quebrava acesso quando sessao caia.
      const pergFirstName = customerName ? customerName.split(" ")[0] : "querida alma";
      const creditsLabel = credits === 1 ? "1 pergunta" : `${credits} perguntas`;

      // Gera magic-link via Supabase Admin API. Cria user se nao existir.
      let magicUrl = `${getSiteUrl(req)}/obrigado-pergunta?email=${encodeURIComponent(email.toLowerCase())}`;
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: email.toLowerCase(),
          options: {
            redirectTo: `${getSiteUrl(req)}/auth/callback?next=${encodeURIComponent("/dashboard/chat?welcome=pergunta")}`,
          },
        });
        const actionLink = (linkData as { properties?: { action_link?: string } } | null)
          ?.properties?.action_link;
        if (actionLink) magicUrl = actionLink;
      } catch (e) {
        logWarn("webhook.kiwify.pergunta", "magic-link gen failed", { email, error: String(e) });
      }

      // Credita JÁ na compra — NÃO espera o cliente clicar no magic-link.
      // generateLink acima garante que o user existe; reconcile soma as
      // purchases pergunta e aplica o saldo + linka a purchase ao user.
      // Idempotente (watermark chat_credits_total_purchased). Sem isto, quem
      // não clicava no link ficava com saldo 0 e o chat escondia o campo de
      // digitar → cliente pagava e não conseguia fazer a pergunta.
      try {
        const { data: pu } = await admin
          .from("users").select("id").eq("email", email.toLowerCase()).maybeSingle();
        if (pu?.id) await reconcileChatCredits(admin, pu.id, email.toLowerCase());
      } catch (e) {
        logWarn("webhook.kiwify.pergunta", "reconcile credits failed", { email, error: String(e) });
      }

      const pergCustomerHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">✨</div>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#e8b84b;font-size:32px;margin:0 0 12px;line-height:1.15;">
        Sua ${creditsLabel} te espera
      </h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
        Olá, <strong style="color:#f5c860;">${escapeHtml(pergFirstName)}</strong>!<br>
        Pagamento confirmado. ATB já está pronta pra te responder.
      </p>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 28px;font-weight:600;">
        Aperte o botão dourado abaixo. Você entra direto no chat para fazer sua pergunta.<br>
        <strong style="color:#e8b84b;">Não precisa criar senha.</strong>
      </p>
      <a href="${magicUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:22px;padding:22px 38px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
        ✨ Entrar agora com 1 toque
      </a>
      <p style="color:#c4b5fd;font-size:14px;margin:18px 0 0;line-height:1.5;">
        Este botão te conecta direto. Se já tinha conta, entrou; se não tinha, ATB criou agora pra você.
      </p>
    </div>

    <div style="background:rgba(126,232,248,0.08);border:1.5px solid rgba(126,232,248,0.3);border-radius:14px;padding:20px;margin-top:20px;text-align:left;">
      <p style="color:#7ee8f8;font-size:16px;font-weight:700;margin:0 0 8px;">💡 Se o botão não funcionar</p>
      <p style="color:#fbf8ff;font-size:15px;line-height:1.6;margin:0;font-weight:500;">
        Copie este link e cole no seu navegador:<br>
        <span style="color:#c4b5fd;font-size:12px;word-break:break-all;">${escapeHtml(magicUrl)}</span>
      </p>
      <p style="color:#c4b5fd;font-size:14px;line-height:1.6;margin:12px 0 0;">
        Se preferir, responda este email — eu, ATB, recebo direto.
      </p>
    </div>

    <div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:14px;line-height:1.6;font-style:italic;">
      Estamos aqui, minha querida alma.
    </div>

    <div style="text-align:center;margin-top:20px;color:#9575cd;font-size:12px;">
      Pedido: ${escapeHtml(orderId) || "N/A"} · ATB
    </div>
  </div>
</body>
</html>`;

      await sendCustomerEmailWithLog({
        scope: "webhook.kiwify.pergunta",
        to: email.toLowerCase(),
        subject: `✨ Sua ${creditsLabel} com ATB está liberada — entre com 1 toque`,
        html: pergCustomerHtml,
        refId: orderId,
      });

      return NextResponse.json({ ok: true, plan: planKey, credits });
    }
  }

  const limpezaProductId = process.env.KIWIFY_LIMPEZA_PRODUCT_ID;
  const isLimpezaByProduct = limpezaProductId && productId && productId === limpezaProductId;
  const isLimpezaByValue = !limpezaProductId && valueBRL >= 95 && valueBRL <= 110;

  if ((event === "order.approved" || event === "order_approved") && (isLimpezaByProduct || isLimpezaByValue)) {
    const matchLimpeza = await findUserByFuzzyEmail(admin, email, customerName);
    const userRow = matchLimpeza.user;
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan: "limpeza",
      event: "limpeza_purchased",
      amount_cents: Math.round(valueBRL * 100),
      user_id: userRow?.id ?? null,
      fuzzy_matched: matchLimpeza.fuzzy,
    });

    const firstName = customerName ? customerName.split(" ")[0] : "querida alma";

    // MAGIC-LINK 1-CLIQUE — cliente entra direto na Limpeza sem criar senha.
    // Antes pedíamos signup+senha e o público 60+ ficava preso. admin.generateLink
    // cria a conta se não existir e gera o token OTP que loga no clique.
    let magicUrl = `${getSiteUrl(req)}/obrigado-limpeza?email=${encodeURIComponent(email.toLowerCase())}`;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase(),
        options: {
          redirectTo: `${getSiteUrl(req)}/auth/callback?next=${encodeURIComponent("/dashboard/limpeza-espiritual")}`,
        },
      });
      const actionLink = (linkData as { properties?: { action_link?: string } } | null)
        ?.properties?.action_link;
      if (actionLink) magicUrl = actionLink;
    } catch (e) {
      logWarn("webhook.kiwify.v1.limpeza", "magic-link gen failed", { email, error: String(e) });
    }

    const customerHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.4);">
      <div style="font-size:64px;margin-bottom:16px;">🕊️</div>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#e8b84b;font-size:32px;margin:0 0 12px;line-height:1.15;">
        Sua Limpeza está pronta
      </h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
        Olá, <strong style="color:#f5c860;">${escapeHtml(firstName)}</strong>!<br>
        Sua compra foi confirmada e os santos já estão preparando sua limpeza sagrada.
      </p>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 28px;font-weight:600;">
        Aperte o botão dourado abaixo. Você entra direto na sua Limpeza.<br>
        <strong style="color:#e8b84b;">Não precisa criar senha.</strong>
      </p>
      <a href="${magicUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:22px;padding:22px 38px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
        ✨ Entrar agora com 1 toque
      </a>
      <p style="color:#c4b5fd;font-size:14px;margin:18px 0 0;line-height:1.5;">
        Este botão te conecta direto. Se já tinha conta, entrou; se não tinha, criamos agora pra você.
      </p>
    </div>

    <div style="background:rgba(126,232,248,0.08);border:1.5px solid rgba(126,232,248,0.3);border-radius:14px;padding:20px;margin-top:20px;text-align:left;">
      <p style="color:#7ee8f8;font-size:16px;font-weight:700;margin:0 0 8px;">💡 Se o botão não funcionar</p>
      <p style="color:#fbf8ff;font-size:15px;line-height:1.6;margin:0;font-weight:500;">
        Copie este link e cole no seu navegador:<br>
        <span style="color:#c4b5fd;font-size:12px;word-break:break-all;">${escapeHtml(magicUrl)}</span>
      </p>
      <p style="color:#c4b5fd;font-size:14px;line-height:1.6;margin:12px 0 0;">
        Ou responda este email — eu, ATB, recebo direto.
      </p>
    </div>

    <div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">
      Que Nossa Senhora Aparecida te cubra com seu manto sagrado.<br>
      Que São Miguel te proteja com sua espada divina.<br>
      Estamos com você, minha querida alma.
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
      subject: "🕊️ Sua Limpeza está pronta — entre com 1 toque",
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
    const matchEsp = await findUserByFuzzyEmail(admin, email, customerName);
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan: "espirito",
      event: "espirito_purchased",
      amount_cents: Math.round(valueBRL * 100),
      user_id: matchEsp.user?.id ?? null,
      fuzzy_matched: matchEsp.fuzzy,
    });

    const espFirstName = customerName ? customerName.split(" ")[0] : "querida alma";
    // orderId em vez de email (LGPD: não vaza e-mail no navegador / referer)
    const espAccessLink = orderId
      ? `${getSiteUrl(req)}/obrigado-espirito?order=${encodeURIComponent(orderId)}`
      : `${getSiteUrl(req)}/obrigado-espirito?email=${encodeURIComponent(email.toLowerCase())}`;

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
    </div>

    <!-- ⚠️ Aviso CRÍTICO — email da conta = email do pagamento -->
    <div style="background:linear-gradient(135deg,rgba(232,184,75,0.22),rgba(232,184,75,0.08));border:2px solid rgba(232,184,75,0.6);border-radius:14px;padding:20px;margin-top:20px;text-align:left;">
      <p style="color:#e8b84b;font-size:18px;font-weight:800;margin:0 0 8px;line-height:1.3;">
        ⚠️ IMPORTANTE — USE ESTE EMAIL
      </p>
      <p style="color:#fbf8ff;font-size:16px;line-height:1.6;margin:0;font-weight:500;">
        Crie sua conta com o <strong style="color:#e8b84b;">mesmo email que você usou no pagamento:</strong><br/>
        <strong style="color:#f5c860;font-size:18px;">${escapeHtml(email.toLowerCase())}</strong><br/>
        <span style="font-size:14px;color:#c4b5fd;">Se usar email diferente, sua compra não vai aparecer.</span>
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
    // Look up existing user com fuzzy match (resolve casos tipo josi@barkert.com.br ↔ barkert.josi@gmail.com)
    const matchVid = await findUserByFuzzyEmail(admin, email, customerName);
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan: "video_call",
      event: "video_call_purchased",
      amount_cents: Math.round(valueBRL * 100),
      user_id: matchVid.user?.id ?? null,
      fuzzy_matched: matchVid.fuzzy,
    });

    // Welcome email pro cliente (antes só existia email pro admin — cliente ficava sem nada após pagar R$497)
    const vidFirstName = customerName ? customerName.split(" ")[0] : "querida alma";
    const vidAccessLink = orderId
      ? `${getSiteUrl(req)}/obrigado-videochamada?order=${encodeURIComponent(orderId)}`
      : `${getSiteUrl(req)}/obrigado-videochamada?email=${encodeURIComponent(email.toLowerCase())}`;

    const vidCustomerHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">📹</div>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;color:#e8b84b;font-size:32px;margin:0 0 12px;line-height:1.15;">
        Sua videochamada está confirmada
      </h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
        Olá, <strong style="color:#f5c860;">${escapeHtml(vidFirstName)}</strong>!<br>
        Recebemos seu pagamento da chamada de vídeo com ATB.
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.65;margin:0 0 28px;">
        Aperte o botão abaixo pra ver os próximos passos e agendar:
      </p>
      <a href="${vidAccessLink}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
        📅 Agendar minha videochamada
      </a>
    </div>

    <div style="background:linear-gradient(135deg,rgba(232,184,75,0.22),rgba(232,184,75,0.08));border:2px solid rgba(232,184,75,0.6);border-radius:14px;padding:20px;margin-top:20px;text-align:left;">
      <p style="color:#e8b84b;font-size:18px;font-weight:800;margin:0 0 8px;line-height:1.3;">
        ⚠️ IMPORTANTE — USE ESTE EMAIL
      </p>
      <p style="color:#fbf8ff;font-size:16px;line-height:1.6;margin:0;font-weight:500;">
        Crie/entre na sua conta com o <strong style="color:#e8b84b;">mesmo email que você usou no pagamento:</strong><br/>
        <strong style="color:#f5c860;font-size:18px;">${escapeHtml(email.toLowerCase())}</strong><br/>
        <span style="font-size:14px;color:#c4b5fd;">Se usar email diferente, seu acesso não aparece.</span>
      </p>
    </div>

    <div style="background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.3);border-radius:14px;padding:22px;margin-top:20px;">
      <h2 style="color:#e8b84b;font-size:18px;margin:0 0 12px;font-family:Georgia,serif;">
        ✦ Como vai ser
      </h2>
      <ol style="color:#fbf8ff;font-size:16px;line-height:1.75;padding-left:22px;margin:0;">
        <li>Aperte o botão dourado acima</li>
        <li>Veja os horários disponíveis</li>
        <li>Escolha data e horário</li>
        <li>Receba o link da sala de vídeo no email + WhatsApp</li>
      </ol>
    </div>

    <div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">
      Já preparei tudo pra te receber em vídeo.<br>
      Qualquer dúvida, responda este email ou chame no WhatsApp.<br>
      Estamos aqui, minha querida alma. 💛
    </div>

    <div style="text-align:center;margin-top:20px;color:#9575cd;font-size:12px;">
      Pedido: ${escapeHtml(orderId) || "N/A"} · ATB
    </div>
  </div>
</body>
</html>`;

    await sendCustomerEmailWithLog({
      scope: "webhook.kiwify.v1.video",
      to: email.toLowerCase(),
      subject: "📹 Sua videochamada com ATB está confirmada",
      html: vidCustomerHtml,
      refId: orderId,
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
               <p><strong>Pedido:</strong> ${escapeHtml(orderId) || "N/A"}</p>
               <p>Email automático com link de agendamento já enviado para a cliente.</p>`,
        refId: orderId,
      });
    }
    return NextResponse.json({ ok: true, plan: "video_call" });
  }

  if (event === "order.approved" || event === "order_approved") {
    const plan = planFromValue(valueBRL);
    const update: Record<string, any> = { plan, kiwify_order_id: orderId ?? null };
    if (customerName && customerName.length <= 100) update.name = customerName;
    // Fuzzy match: se conta existe com email diferente, atualiza ela (não a do pagamento)
    const matchSub = await findUserByFuzzyEmail(admin, email, customerName);
    if (matchSub.user?.id) {
      await admin.from("users").update(update).eq("id", matchSub.user.id);
    } else {
      await admin.from("users").update(update).eq("email", email.toLowerCase());
    }
    const userRow = matchSub.user;
    await admin.from("purchases").insert({
      email: email.toLowerCase(),
      name: customerName ?? null,
      kiwify_order_id: orderId ?? "unknown",
      plan,
      event,
      amount_cents: valueCents > 0 ? Math.round(valueCents > 1000 ? valueCents : valueCents * 100) : null,
      user_id: userRow?.id ?? null,
      fuzzy_matched: matchSub.fuzzy,
    });

    // Welcome email pra Basic/Premium se cliente NÃO tinha conta ainda.
    // Sem isso, cliente paga R$29 ou R$197/mês e fica sem saber como acessar.
    if (!userRow) {
      const subFirstName = customerName ? customerName.split(" ")[0] : "querida alma";
      const subAccessLink = `${getSiteUrl(req)}/cadastro?email=${encodeURIComponent(email.toLowerCase())}`;
      const subProductName = plan === "premium" ? "Consulta Completa com ATB" : "Basic";
      const subPriceLabel = plan === "premium" ? "R$ 197/mês" : "R$ 29/mês";

      const subCustomerHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:30px 20px;">
    <div style="background:linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%);border-radius:20px;padding:40px 28px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
      <div style="font-size:64px;margin-bottom:16px;">🔮</div>
      <h1 style="color:#e8b84b;font-size:32px;margin:0 0 12px;line-height:1.15;">
        Bem-vinda ao ATB ${escapeHtml(subProductName)}
      </h1>
      <p style="color:#fbf8ff;font-size:18px;line-height:1.65;margin:0 0 22px;font-weight:500;">
        Olá, <strong style="color:#f5c860;">${escapeHtml(subFirstName)}</strong>!<br>
        Sua assinatura ${escapeHtml(subPriceLabel)} foi confirmada. ATB já está pronta pra te receber.
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.65;margin:0 0 28px;">
        Crie sua conta em 30 segundos pra começar a conversar:
      </p>
      <a href="${subAccessLink}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
        ✨ Criar minha conta agora
      </a>
    </div>

    <div style="background:linear-gradient(135deg,rgba(232,184,75,0.22),rgba(232,184,75,0.08));border:2px solid rgba(232,184,75,0.6);border-radius:14px;padding:20px;margin-top:20px;text-align:left;">
      <p style="color:#e8b84b;font-size:18px;font-weight:800;margin:0 0 8px;line-height:1.3;">
        ⚠️ IMPORTANTE — USE ESTE EMAIL
      </p>
      <p style="color:#fbf8ff;font-size:16px;line-height:1.6;margin:0;font-weight:500;">
        Crie sua conta com o <strong style="color:#e8b84b;">mesmo email que você usou no pagamento:</strong><br/>
        <strong style="color:#f5c860;font-size:18px;">${escapeHtml(email.toLowerCase())}</strong><br/>
        <span style="font-size:14px;color:#c4b5fd;">Se usar email diferente, seu plano não vai aparecer.</span>
      </p>
    </div>

    <div style="background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.3);border-radius:14px;padding:22px;margin-top:20px;">
      <h2 style="color:#e8b84b;font-size:18px;margin:0 0 12px;font-family:Georgia,serif;">
        ✦ Como começar
      </h2>
      <ol style="color:#fbf8ff;font-size:16px;line-height:1.75;padding-left:22px;margin:0;">
        <li>Aperte o botão "Criar minha conta agora"</li>
        <li>Coloque seu nome + crie uma senha</li>
        <li>Pronto — converse com ATB no chat</li>
      </ol>
    </div>

    <div style="text-align:center;margin-top:28px;padding:20px;color:#9575cd;font-size:13px;line-height:1.6;font-style:italic;">
      Estamos aqui, minha querida alma. 💛
    </div>

    <div style="text-align:center;margin-top:20px;color:#9575cd;font-size:12px;">
      Pedido: ${escapeHtml(orderId) || "N/A"} · ATB
    </div>
  </div>
</body>
</html>`;

      await sendCustomerEmailWithLog({
        scope: "webhook.kiwify.subscription",
        to: email.toLowerCase(),
        subject: `🔮 Bem-vinda ao ATB ${subProductName}`,
        html: subCustomerHtml,
        refId: orderId,
      });
    }

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
