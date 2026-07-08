import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeInput, rateLimit, getClientIp, validateEmail } from "@/lib/security";
import { generatePreview, VALID_THEMES, VALID_SIGNS, THEME_LABELS } from "@/lib/limpeza-v2";
import { createCheckoutSession, currencyForRequest, detectIsInternational } from "@/lib/stripe";
import { PLAN_PRICES } from "@/lib/pricing";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const maxDuration = 30;

function safeBirthDate(s: string | null | undefined): string | null {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 1900 || year > new Date().getUTCFullYear()) return null;
  return s;
}

function safePhone(s: string | null | undefined): string | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d+\s()-]/g, "").trim().slice(0, 20);
  return cleaned.length >= 8 ? cleaned : null;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // Rate limit anti-spam (publico, sem auth)
    const rl = await rateLimit(`limpeza-v2-preview:${ip}`, 6, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde um momento." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    // Body limit
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8_000) {
      return NextResponse.json({ error: "Dados muito longos." }, { status: 413 });
    }

    const body = await req.json().catch(() => ({}));

    // Nome
    const nameSan = sanitizeInput(String(body?.name || ""), 80);
    if (!nameSan.ok || nameSan.value.length < 2) {
      return NextResponse.json({ error: "Por favor preencha seu nome." }, { status: 400 });
    }
    const name = nameSan.value;

    // Email
    const email = String(body?.email || "").toLowerCase().trim();
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      return NextResponse.json({ error: emailCheck.reason || "Email inválido." }, { status: 400 });
    }

    // Tema (whitelist)
    const theme = String(body?.theme || "");
    if (!(VALID_THEMES as readonly string[]).includes(theme)) {
      return NextResponse.json({ error: "Selecione um tema." }, { status: 400 });
    }

    // Pergunta
    const qSan = sanitizeInput(String(body?.question || ""), 800);
    if (!qSan.ok || qSan.value.length < 10) {
      return NextResponse.json(
        { error: "Conte com suas palavras o que está sentindo (mínimo 10 caracteres)." },
        { status: 400 }
      );
    }
    const question = qSan.value;

    // Opcionais
    const phone = safePhone(String(body?.phone || ""));
    const birthDate = safeBirthDate(String(body?.birth_date || ""));
    const signRaw = String(body?.sign || "").toLowerCase();
    const sign = VALID_SIGNS.includes(signRaw) ? signRaw : null;

    const admin = createAdminClient();

    // Decide provider de pagamento: Kiwify (BR) ou Stripe (internacional).
    // Cliente pode forçar via { force_provider: "stripe" | "kiwify" } no body.
    const forceProvider = String(body?.force_provider || "").toLowerCase();
    const moneyInfo = currencyForRequest(req);
    let provider: "kiwify" | "stripe";
    if (forceProvider === "stripe") provider = "stripe";
    else if (forceProvider === "kiwify") provider = "kiwify";
    else provider = moneyInfo.isInternational ? "stripe" : "kiwify";

    const isStripe = provider === "stripe";
    // Preço intl unificado com PLAN_PRICES.limpeza ($100/€100/¥10000) — antes
    // usava moneyInfo.amount, que devolvia €18 / ¥2900 / NaN-USD (env placeholder).
    // PLAN_PRICES é em centavos; createCheckoutSession espera UNIDADES e faz ×100
    // (exceto JPY). Logo: JPY usa o valor inteiro; demais dividem por 100.
    const limpezaCents = PLAN_PRICES.limpeza[moneyInfo.currency];
    const stripeUnits = moneyInfo.currency === "jpy" ? limpezaCents : limpezaCents / 100;
    const amount = isStripe ? stripeUnits : Number(process.env.LIMPEZA_V2_PRICE || 97);
    const currency = isStripe ? moneyInfo.currency.toUpperCase() : "BRL";
    const locale = isStripe ? moneyInfo.locale : "pt-BR";

    // Pré-condição: pelo menos UM provedor de checkout precisa estar configurado.
    // Verificamos antes de gastar token de DeepSeek + criar order órfão.
    const baseKiwify = process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL || "";
    const stripeAvailable = !!process.env.STRIPE_SECRET_KEY;
    if (!baseKiwify && !stripeAvailable) {
      return NextResponse.json(
        { error: "Pagamento indisponível no momento. Tente novamente mais tarde." },
        { status: 503 }
      );
    }

    // M-1: Gera preview com DeepSeek ANTES de criar a order. Se a IA falhar,
    // não fica order pending órfã no banco.
    let previewText: string;
    try {
      previewText = await generatePreview({
        name,
        theme: THEME_LABELS[theme as keyof typeof THEME_LABELS] || theme,
        sign,
        question,
      });
    } catch {
      return NextResponse.json(
        { error: "Não conseguimos preparar sua prévia agora. Tente em alguns minutos." },
        { status: 502 }
      );
    }

    // Cap defensivo de 80 palavras (caso a IA passe)
    const words = previewText.split(/\s+/);
    if (words.length > 90) previewText = words.slice(0, 80).join(" ") + "...";

    // Cria order pending (preview já garantido)
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        name,
        email,
        phone,
        birth_date: birthDate,
        sign,
        locale,
        theme,
        question,
        amount,
        currency,
        status: "pending",
        product_type: "limpeza_espiritual",
        payment_provider: provider,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Erro ao registrar pedido." }, { status: 500 });
    }

    // M-5: Monta URL do checkout (Kiwify ou Stripe). Se ambos falharem,
    // limpamos a order recém-criada e retornamos 503.

    // Atribuição Google Ads: anexa gclid/gbraid/wbraid + utm_* (cookies atb_gclid/
    // atb_attr do AttributionTracker) na URL do checkout Kiwify. O pixel da Kiwify
    // captura o gclid da URL e carimba a conversão — sem isso o Google não atribui
    // a venda ao anúncio. Best-effort: qualquer falha cai na URL original.
    function trackingParams(): Record<string, string> {
      const out: Record<string, string> = {};
      try {
        const cookie = req.headers.get("cookie") || "";
        for (const [name, keys] of [
          ["atb_gclid", ["gclid", "gbraid", "wbraid"]],
          ["atb_attr", ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]],
        ] as const) {
          const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
          if (!m) continue;
          const obj = JSON.parse(decodeURIComponent(m[1])) as Record<string, unknown>;
          for (const k of keys) {
            const v = obj[k];
            if (typeof v === "string" && v) out[k] = v.slice(0, 150);
          }
        }
      } catch {
        /* best-effort */
      }
      // Veio de anúncio (gclid) sem utm → rotula a origem pro painel do Kiwify.
      if (out.gclid && !out.utm_source) {
        out.utm_source = "google";
        out.utm_medium = "cpc";
      }
      return out;
    }

    function buildKiwifyUrl(orderId: string): string | null {
      if (!baseKiwify) return null;
      try {
        const u = new URL(baseKiwify);
        u.searchParams.set("external_reference", orderId);
        u.searchParams.set("email", email);
        for (const [k, v] of Object.entries(trackingParams())) u.searchParams.set(k, v);
        return u.toString();
      } catch {
        const sep = baseKiwify.includes("?") ? "&" : "?";
        return `${baseKiwify}${sep}external_reference=${orderId}&email=${encodeURIComponent(email)}`;
      }
    }

    let checkoutUrl: string | null = null;
    if (isStripe) {
      try {
        const baseUrl = getSiteUrl(req);
        const session = await createCheckoutSession({
          orderId: order.id,
          email,
          name,
          // FIX: era moneyInfo.amount (placeholder $19/€18/¥2900) — cobrava a
          // menos e divergia da prévia. `amount` = stripeUnits do PLAN_PRICES
          // ($100/€100/¥10000), o mesmo valor gravado na order e mostrado ao cliente.
          amount,
          currency: moneyInfo.currency,
          locale: moneyInfo.locale,
          successUrl: `${baseUrl}/entrega/${order.id}?provider=stripe`,
          cancelUrl: `${baseUrl}/limpeza/preview/${order.id}`,
        });
        checkoutUrl = session?.url || buildKiwifyUrl(order.id);
      } catch {
        // Fallback: se Stripe falhar, tenta Kiwify
        checkoutUrl = buildKiwifyUrl(order.id);
      }
    } else {
      checkoutUrl = buildKiwifyUrl(order.id);
    }

    if (!checkoutUrl) {
      // Ambos provedores falharam — limpa a order para não deixar órfã.
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Pagamento indisponível no momento. Tente novamente em instantes." },
        { status: 503 }
      );
    }

    // Salva reading com preview
    await admin.from("readings").insert({
      order_id: order.id,
      preview_text: previewText,
      language: locale,
      model_used: "deepseek",
      generation_status: "preview_generated",
    });

    // Atualiza order com checkout_url
    await admin.from("orders").update({ checkout_url: checkoutUrl }).eq("id", order.id);

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      previewText,
      checkoutUrl,
      price: amount,
      currency,
      provider,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
