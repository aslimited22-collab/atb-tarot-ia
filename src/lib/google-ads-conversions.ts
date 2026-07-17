// Upload de conversões de clique (server-to-server) pro Google Ads.
//
// POR QUÊ: hoje a conversão "Compra" dos produtos BR depende 100% do pixel
// client-side configurado no painel do Kiwify (invisível a este repo, quebra
// silenciosamente se alguém mexer no produto). Isto cria um caminho DURÁVEL
// e redundante: quando o webhook confirma uma venda com gclid conhecido,
// reportamos direto pra API do Google Ads.
//
// ⚠️ REQUER SETUP MANUAL NO GOOGLE CLOUD/ADS (não é "só setar env"):
//   1. Google Cloud Console → criar projeto → OAuth client ID (tipo "Desktop app").
//   2. Google Ads → Ferramentas → Acesso e segurança → API Center → solicitar
//      "Developer Token" (nível Basic já cobre upload de conversões).
//   3. Rodar o fluxo OAuth uma vez (ex.: OAuth Playground) autorizando o escopo
//      https://www.googleapis.com/auth/adwords → gera um REFRESH TOKEN.
//   4. GOOGLE_ADS_CONVERSION_ACTION_ID é o ID NUMÉRICO da ação "Compra" — NÃO é
//      o rótulo "Vn61CImjkcccEPDd_p0q" usado no gtag. Pegue em Google Ads →
//      Metas → Conversões → clique em "Compra" → o ID aparece na URL
//      (…conversion_action/123456789…) ou via GAQL `SELECT conversion_action.id`.
//
// Sem as 6 envs abaixo, toda chamada é no-op logado — nunca quebra o webhook.
import { logInfo, logWarn } from "@/lib/logger";

const API_VERSION = "v18";

type ClickConversionInput = {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  orderId: string;
  valueBRL: number;
  conversionDateTime: Date;
};

export type ConversionResult = { ok: boolean; reason?: string };

function readEnv() {
  return {
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || "",
    customerId: (process.env.GOOGLE_ADS_CUSTOMER_ID || "").replace(/-/g, ""),
    conversionActionId: process.env.GOOGLE_ADS_CONVERSION_ACTION_ID || "",
  };
}

export function isGoogleAdsApiConfigured(): boolean {
  const e = readEnv();
  return !!(e.developerToken && e.clientId && e.clientSecret && e.refreshToken && e.customerId && e.conversionActionId);
}

// Cache do access_token em memória do processo — barato, expira em ~1h; só
// serve pra evitar 1 round-trip extra em invocações "quentes" da mesma Lambda.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(e: ReturnType<typeof readEnv>): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: e.clientId,
        client_secret: e.clientSecret,
        refresh_token: e.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      logWarn("google-ads-conversions", "token refresh failed", { status: res.status, body: (await res.text()).slice(0, 300) });
      return null;
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  } catch (err) {
    logWarn("google-ads-conversions", "token refresh exception", { error: String(err) });
    return null;
  }
}

/**
 * Envia UMA conversão de clique pro Google Ads. Fail-soft total: qualquer
 * problema (env faltando, token, rede, resposta 4xx/5xx) retorna
 * `{ ok:false }` e loga — NUNCA lança exceção pro chamador (webhook).
 *
 * Dedupe: usamos `order_id` do Kiwify como `orderId` no payload — o Google
 * Ads deduplica conversões da mesma ação com o mesmo orderId, então retries
 * do webhook (mesmo com nonce já bloqueando replay aqui) não duplicam lá.
 */
export async function sendClickConversion(input: ClickConversionInput): Promise<ConversionResult> {
  const e = readEnv();
  if (!isGoogleAdsApiConfigured()) {
    return { ok: false, reason: "not_configured" };
  }
  if (!input.gclid && !input.gbraid && !input.wbraid) {
    return { ok: false, reason: "no_click_id" };
  }

  const accessToken = await getAccessToken(e);
  if (!accessToken) {
    return { ok: false, reason: "token_unavailable" };
  }

  const conversionAction = `customers/${e.customerId}/conversionActions/${e.conversionActionId}`;
  const conversion: Record<string, unknown> = {
    conversionAction,
    conversionDateTime: formatGoogleDateTime(input.conversionDateTime),
    conversionValue: input.valueBRL,
    currencyCode: "BRL",
    orderId: input.orderId,
  };
  if (input.gclid) conversion.gclid = input.gclid;
  else if (input.gbraid) conversion.gbraid = input.gbraid;
  else if (input.wbraid) conversion.wbraid = input.wbraid;

  try {
    const res = await fetch(
      `https://googleads.googleapis.com/${API_VERSION}/customers/${e.customerId}:uploadClickConversions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "developer-token": e.developerToken,
        },
        body: JSON.stringify({ conversions: [conversion], partialFailure: true }),
      }
    );

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      logWarn("google-ads-conversions", "upload http error", { status: res.status, body: JSON.stringify(body).slice(0, 500) });
      return { ok: false, reason: `http_${res.status}` };
    }
    const partialFailureError = (body as { partialFailureError?: unknown })?.partialFailureError;
    if (partialFailureError) {
      logWarn("google-ads-conversions", "partial failure", { error: JSON.stringify(partialFailureError).slice(0, 500), orderId: input.orderId });
      return { ok: false, reason: "partial_failure" };
    }
    logInfo("google-ads-conversions", "uploaded", { orderId: input.orderId, hasGclid: !!input.gclid });
    return { ok: true };
  } catch (err) {
    logWarn("google-ads-conversions", "upload exception", { error: String(err), orderId: input.orderId });
    return { ok: false, reason: "exception" };
  }
}

function formatGoogleDateTime(d: Date): string {
  // Formato exigido: "yyyy-MM-dd HH:mm:ss+HH:mm". Usamos UTC (+00:00) — o Google
  // aceita qualquer timezone consistente, não precisa ser a do anunciante.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`;
}
