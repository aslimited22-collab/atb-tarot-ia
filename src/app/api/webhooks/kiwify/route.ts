import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyKiwifySignature, planFromValue } from "@/lib/kiwify";
import { rateLimit, getClientIp } from "@/lib/security";
import { deliverLimpezaOrder, sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";
import { findUserByFuzzyEmail } from "@/lib/user-matching";
import { reconcileChatCredits } from "@/lib/reconcileCredits";
import { buildAbandonedEmail } from "@/lib/remarketing-email";
import { magicLinkFromGenerate } from "@/lib/magic-entry";
import { sendClickConversion, isGoogleAdsApiConfigured } from "@/lib/google-ads-conversions";
import { isTestClickId } from "@/lib/click-id";

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

  // ─── T1: click-id + UTM do pedido (pra conversão server-side no Google Ads) ───
  // Kiwify só documenta reconhecer src/sck/utm_*/s1/s2/s3 como params de
  // rastreamento — "gclid" não é nativo deles. Por isso o checkout também grava
  // o gclid no slot "s1" (redundância — ver checkout/[plan]/route.ts e
  // limpeza/preview/route.ts). Extração defensiva: tenta vários caminhos
  // plausíveis; se nenhum bater, `gclid` fica undefined e nada quebra.
  const trackingSrc: Record<string, unknown> =
    order.TrackingParameters || order.trackingParameters || order.tracking_parameters ||
    payload.TrackingParameters || payload.trackingParameters || {};
  const gclid: string | undefined =
    (typeof trackingSrc.s1 === "string" && trackingSrc.s1) ||
    (typeof order.s1 === "string" && order.s1) ||
    (typeof payload.s1 === "string" && payload.s1) ||
    (typeof trackingSrc.gclid === "string" && trackingSrc.gclid) ||
    (typeof order.gclid === "string" && order.gclid) ||
    (typeof payload.gclid === "string" && payload.gclid) ||
    undefined;
  const gbraid: string | undefined =
    (typeof trackingSrc.s2 === "string" && trackingSrc.s2) ||
    (typeof order.gbraid === "string" && order.gbraid) ||
    undefined;
  const wbraid: string | undefined =
    (typeof trackingSrc.s3 === "string" && trackingSrc.s3) ||
    (typeof order.wbraid === "string" && order.wbraid) ||
    undefined;
  const trackUtmSource: string | undefined =
    (typeof trackingSrc.utm_source === "string" && trackingSrc.utm_source) ||
    (typeof order.utm_source === "string" && order.utm_source) ||
    (typeof payload.utm_source === "string" && payload.utm_source) ||
    undefined;
  const trackUtmMedium: string | undefined =
    (typeof trackingSrc.utm_medium === "string" && trackingSrc.utm_medium) ||
    (typeof order.utm_medium === "string" && order.utm_medium) ||
    undefined;
  const trackUtmCampaign: string | undefined =
    (typeof trackingSrc.utm_campaign === "string" && trackingSrc.utm_campaign) ||
    (typeof order.utm_campaign === "string" && order.utm_campaign) ||
    undefined;
  // Click-ids de TESTE (ATB_*/TEST*) nunca entram em purchases nem sobem pro
  // Google — compra-teste de QA com gclid falso não vira conversão inválida.
  const safeGclid = isTestClickId(gclid) ? undefined : gclid;
  const safeGbraid = isTestClickId(gbraid) ? undefined : gbraid;
  const safeWbraid = isTestClickId(wbraid) ? undefined : wbraid;
  const gadsTracking = { gclid: safeGclid, gbraid: safeGbraid, wbraid: safeWbraid, utm_source: trackUtmSource, utm_medium: trackUtmMedium, utm_campaign: trackUtmCampaign };

  // Diagnóstico ÚNICO por venda: já que os nomes reais dos campos de tracking
  // no payload da Kiwify não são 100% documentados publicamente, logamos o
  // resultado da extração (+ payload cru truncado) na primeira venda aprovada
  // pra confirmar/corrigir os caminhos acima com dado real de produção.
  if (event === "order.approved" || event === "order_approved") {
    logInfo("webhook.kiwify.tracking", "gclid extraction", {
      orderId,
      resolved: gadsTracking,
      gadsApiConfigured: isGoogleAdsApiConfigured(),
      rawPreview: raw.slice(0, 1200),
    });
  }

  // Dispara o upload server-side pro Google Ads (fail-soft — nunca lança).
  // Chamar depois de gravar em `purchases` em cada branch de venda aprovada;
  // NÃO chamar em refund/cancelamento (não é conversão).
  async function reportGadsConversion() {
    if (!safeGclid && !safeGbraid && !safeWbraid) return; // sem click-id real, nada a reportar
    try {
      const result = await sendClickConversion({
        gclid: safeGclid,
        gbraid: safeGbraid,
        wbraid: safeWbraid,
        orderId: orderId ?? "unknown",
        valueBRL,
        conversionDateTime: new Date(),
      });
      if (!result.ok && result.reason !== "not_configured") {
        logWarn("webhook.kiwify.tracking", "gads conversion not sent", { orderId, reason: result.reason });
      }
    } catch (e) {
      logWarn("webhook.kiwify.tracking", "gads conversion exception", { orderId, error: String(e) });
    }
  }

  if (!email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  // Valida formato básico do email antes de usar no banco
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  // Remarketing: qualquer compra aprovada converte os leads abertos deste
  // e-mail (mede receita recuperada e impede e-mail de resgate pra quem já
  // pagou). Fail-soft: nunca bloqueia o processamento da venda.
  if (event === "order.approved" || event === "order_approved") {
    try {
      await admin
        .from("leads")
        .update({ converted_at: new Date().toISOString() })
        .eq("email", email.toLowerCase())
        .is("converted_at", null);
    } catch {}
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
        ...gadsTracking,
      });
      if (purErr) {
        logWarn("webhook.kiwify", "purchases insert failed", { orderId: v2Order.id, error: purErr.message });
      }
      await reportGadsConversion();

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
        ...gadsTracking,
      });
      await reportGadsConversion();

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
        magicUrl = magicLinkFromGenerate(linkData, getSiteUrl(req), magicUrl);
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
      ...gadsTracking,
    });
    await reportGadsConversion();

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
      magicUrl = magicLinkFromGenerate(linkData, getSiteUrl(req), magicUrl);
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
        Logo abaixo está a sua Limpeza, pra você ler agora mesmo.<br>
        E pra conversar comigo ao vivo, é só tocar no botão dourado — <strong style="color:#e8b84b;">não precisa senha</strong>.
      </p>
      <a href="${magicUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:22px;padding:22px 38px;border-radius:14px;text-decoration:none;letter-spacing:0.02em;box-shadow:0 8px 24px rgba(232,184,75,0.4);">
        ✨ Conversar ao vivo com a ATB
      </a>
      <p style="color:#c4b5fd;font-size:14px;margin:18px 0 0;line-height:1.5;">
        Este botão te conecta direto. Se já tinha conta, entrou; se não tinha, criamos agora pra você.
      </p>
    </div>

    <div style="background:#1a0033;border-radius:16px;padding:30px 24px;margin-top:22px;text-align:left;border:1px solid rgba(232,184,75,0.3);">
      <div style="text-align:center;font-size:13px;color:#e8b84b;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">A sua Limpeza Espiritual</div>
      <h2 style="font-family:'Cormorant Garamond',Georgia,serif;color:#e8b84b;font-size:25px;text-align:center;margin:0 0 18px;line-height:1.2;">Feita com carinho, só pra você</h2>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.8;margin:0 0 16px;font-weight:500;">
        ${escapeHtml(firstName)}, neste momento eu coloco você diante de Nossa Senhora Aparecida, e peço que Ela te cubra com o manto sagrado, tirando de você todo peso, toda tristeza e toda energia ruim que andou te acompanhando.
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.8;margin:0 0 16px;font-weight:500;">
        Chamo São Miguel Arcanjo, que com a espada dele corta agora todo feitiço, toda inveja, toda demanda e todo trabalho feito contra você. E chamo São Jorge Guerreiro, pra te proteger de todo olho gordo e de todo inimigo, visível e invisível.
      </p>
      <p style="color:#f5c860;font-size:17px;line-height:1.85;margin:0 0 18px;font-weight:600;font-style:italic;text-align:center;">
        "Eu me limpo, eu me liberto, eu me protejo. Pela força dos santos, meus caminhos estão abertos, minha casa está protegida e minha alma está em paz. Amém."
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.8;margin:0 0 10px;font-weight:600;">Pra completar a sua limpeza em casa, minha filha:</p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.95;margin:0 0 16px;font-weight:500;">
        🕯️ Acenda uma vela branca para Nossa Senhora hoje à noite.<br>
        🧂 Numa terça ou sexta, tome um banho de sal grosso do pescoço para baixo (3 punhados), pedindo para lavar tudo de ruim.<br>
        🌿 Se puder, defume sua casa com alecrim ou incenso, do fundo até a porta da rua.<br>
        🙏 Reze o Salmo 91 toda manhã, que é a oração da proteção.
      </p>
      <p style="color:#fbf8ff;font-size:17px;line-height:1.8;margin:0;font-weight:500;">
        Pode guardar este e-mail e ler sempre que precisar de força. A sua limpeza já começou — e quando quiser, eu te espero para continuarmos ao vivo.
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
      subject: "🕊️ A sua Limpeza Espiritual com a ATB — leia agora, minha filha",
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
      ...gadsTracking,
    });
    await reportGadsConversion();

    const espFirstName = customerName ? customerName.split(" ")[0] : "querida alma";
    // Magic-link 1-toque: cria a conta e loga DIRETO no Espírito Mentor, sem senha.
    // Fallback: link por orderId (LGPD: não vaza e-mail no navegador / referer).
    let espAccessLink = orderId
      ? `${getSiteUrl(req)}/obrigado-espirito?order=${encodeURIComponent(orderId)}`
      : `${getSiteUrl(req)}/obrigado-espirito?email=${encodeURIComponent(email.toLowerCase())}`;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase(),
        options: { redirectTo: `${getSiteUrl(req)}/auth/callback?next=${encodeURIComponent("/dashboard/espirito-mentor")}` },
      });
      espAccessLink = magicLinkFromGenerate(linkData, getSiteUrl(req), espAccessLink);
    } catch (e) {
      logWarn("webhook.kiwify.v1.espirito", "magic-link gen failed", { email, error: String(e) });
    }

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
        <li>Aperte o botão dourado acima — você entra direto, sem senha</li>
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

  // VÍDEO CHAMADA (R$ 497–877) — detecta por product-id OU por faixa de valor.
  // A faixa 470–900 cobre o preço atual (R$877) e o antigo (R$497); nenhum outro
  // produto cai nela (limpeza 100, perguntas 19–39, consulta 250, espírito 437).
  // O valor SEMPRE vale como fallback — assim, mesmo que o product-id não bata,
  // a venda é classificada como vídeo em vez de cair no "premium" (bug da Clarice/R$877).
  const videoProductId = process.env.KIWIFY_VIDEO_PRODUCT_ID;
  const isVideoByProduct = videoProductId && productId && productId === videoProductId;
  const isVideoByValue = valueBRL >= 470 && valueBRL <= 900;

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
      ...gadsTracking,
    });
    await reportGadsConversion();

    // Welcome email pro cliente (antes só existia email pro admin — cliente ficava sem nada após pagar R$497)
    const vidFirstName = customerName ? customerName.split(" ")[0] : "querida alma";
    // Magic-link 1-toque: cria a conta e loga no painel, sem senha. Fallback:
    // link por orderId. (/dashboard/videochamada não existe → hub /dashboard.)
    let vidAccessLink = orderId
      ? `${getSiteUrl(req)}/obrigado-videochamada?order=${encodeURIComponent(orderId)}`
      : `${getSiteUrl(req)}/obrigado-videochamada?email=${encodeURIComponent(email.toLowerCase())}`;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase(),
        options: { redirectTo: `${getSiteUrl(req)}/auth/callback?next=${encodeURIComponent("/dashboard")}` },
      });
      vidAccessLink = magicLinkFromGenerate(linkData, getSiteUrl(req), vidAccessLink);
    } catch (e) {
      logWarn("webhook.kiwify.v1.video", "magic-link gen failed", { email, error: String(e) });
    }

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
      ...gadsTracking,
    });
    await reportGadsConversion();

    // Welcome email pra Basic/Premium se cliente NÃO tinha conta ainda.
    // Sem isso, cliente paga R$29 ou R$197/mês e fica sem saber como acessar.
    if (!userRow) {
      const subFirstName = customerName ? customerName.split(" ")[0] : "querida alma";
      const subAccessLink = `${getSiteUrl(req)}/cadastro?email=${encodeURIComponent(email.toLowerCase())}`;
      const subProductName = plan === "premium" ? "Consulta Completa com ATB" : "Basic";
      const subPriceLabel = plan === "premium" ? "R$ 250/mês" : "R$ 29/mês";

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

  // ─── REMARKETING: eventos de NÃO-compra ────────────────────────────────────
  // Carrinho abandonado / Pix gerado / boleto / compra recusada — gatilhos
  // ativados no painel Kiwify apontando pro MESMO webhook (mesma assinatura).
  // Nomes exatos dos eventos variam por conta — regex defensiva + log do payload
  // cru pra confirmar campos no 1º evento real. Abandono envia e-mail NA HORA
  // (a Kiwify já espera antes de disparar o gatilho — lead quente); Pix/boleto/
  // recusada só gravam o lead: o cliente ainda pode pagar, e o cron
  // /api/cron/remarketing envia 2h+ depois se não houver compra nesse meio-tempo.
  const evLc = event.toLowerCase();
  const leadSource =
    /abandon|carrinho/.test(evLc) ? "kiwify_abandoned" :
    /pix/.test(evLc) ? "kiwify_pix" :
    /boleto|billet/.test(evLc) ? "kiwify_boleto" :
    /recus|reject|refus/.test(evLc) ? "kiwify_refused" :
    null;

  if (leadSource) {
    logInfo("webhook.kiwify.lead", "non-purchase event received", {
      event,
      source: leadSource,
      raw: raw.slice(0, 1500),
    });

    const emailLc = email.toLowerCase();
    const productLabel: string | undefined =
      order.Product?.product_name ||
      order.product?.name ||
      payload.Product?.product_name ||
      payload.product_name;
    const checkoutUrl: string | undefined =
      payload.checkout_link ||
      payload.checkout_url ||
      order.checkout_link ||
      order.checkout_url;
    const leadPhone: string | undefined =
      order.Customer?.mobile ||
      order.Customer?.phone ||
      payload.Customer?.mobile ||
      payload.phone;

    const day = new Date().toISOString().slice(0, 10);
    const { data: leadRow, error: leadErr } = await admin
      .from("leads")
      .upsert(
        {
          email: emailLc,
          name: customerName ?? null,
          phone: leadPhone ?? null,
          source: leadSource,
          product_label: productLabel ?? null,
          checkout_url: checkoutUrl ?? null,
          locale: "pt", // checkout Kiwify é BR
          amount_cents: valueCents > 0 ? Math.round(valueCents > 1000 ? valueCents : valueCents * 100) : null,
          dedup_key: `${leadSource}:${emailLc}:${day}`,
        },
        { onConflict: "dedup_key", ignoreDuplicates: true }
      )
      .select("id")
      .maybeSingle();
    if (leadErr) {
      logWarn("webhook.kiwify.lead", "lead insert failed", { email: emailLc, error: leadErr.message });
    }

    // Lead NOVO de abandono → e-mail de resgate imediato (checando opt-out
    // LGPD e compra recente — quem pagou nas últimas 24h não recebe).
    if (leadRow?.id && leadSource === "kiwify_abandoned") {
      try {
        const { count: optedOut } = await admin
          .from("email_optouts")
          .select("*", { count: "exact", head: true })
          .eq("email", emailLc);
        const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count: boughtRecently } = await admin
          .from("purchases")
          .select("*", { count: "exact", head: true })
          .eq("email", emailLc)
          .gte("created_at", dayAgo);

        if (!optedOut && !boughtRecently) {
          const { subject, html } = buildAbandonedEmail({
            locale: "pt",
            email: emailLc,
            name: customerName,
            productLabel,
            checkoutUrl,
            siteUrl: getSiteUrl(req),
          });
          const sent = await sendCustomerEmailWithLog({
            scope: "remarketing.abandoned",
            to: emailLc,
            subject,
            html,
            refId: leadRow.id,
          });
          if (sent.ok) {
            await admin
              .from("leads")
              .update({ remarketing_sent_at: new Date().toISOString() })
              .eq("id", leadRow.id);
          }
        }
      } catch (e) {
        logWarn("webhook.kiwify.lead", "abandoned email failed", { email: emailLc, error: String(e) });
      }
    }

    return NextResponse.json({ ok: true, lead: leadSource, fresh: !!leadRow?.id });
  }

  return NextResponse.json({ ok: true, ignored: event });
}
