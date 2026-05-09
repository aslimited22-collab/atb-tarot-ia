// Helper de envio WhatsApp via Z-API.
// Fail-soft: se vars não configuradas, retorna { ok: false, reason: "not_configured" }
// e o webhook continua o fluxo (email Resend ainda é enviado).
//
// Configurar na Vercel:
//   ZAPI_INSTANCE_ID=...     (ex: 3DXXXXX)
//   ZAPI_INSTANCE_TOKEN=...  (ex: ABC123...)
//   ZAPI_CLIENT_TOKEN=...    (security token da Z-API)

import { toE164BR } from "./phone";

export type ZApiResult = {
  ok: boolean;
  reason?: string;
  status?: number;
  body?: string;
  messageId?: string;
};

function getConfig() {
  const instance = process.env.ZAPI_INSTANCE_ID || "";
  const token = process.env.ZAPI_INSTANCE_TOKEN || "";
  const clientToken = process.env.ZAPI_CLIENT_TOKEN || "";
  if (!instance || !token) return null;
  return { instance, token, clientToken };
}

export function isZApiConfigured(): boolean {
  return !!getConfig();
}

/**
 * Envia mensagem de texto via Z-API. Fail-soft.
 *
 * Doc: https://developer.z-api.io/message/send-message-text
 */
export async function sendWhatsAppText(
  rawPhone: string | null | undefined,
  message: string
): Promise<ZApiResult> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, reason: "not_configured" };

  const { e164, reason } = toE164BR(rawPhone);
  if (!e164) return { ok: false, reason: `invalid_phone:${reason || "unknown"}` };

  // Z-API espera o telefone SEM o "+" e sem traços
  const phoneClean = e164.replace(/^\+/, "");

  const url = `https://api.z-api.io/instances/${cfg.instance}/token/${cfg.token}/send-text`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cfg.clientToken) headers["Client-Token"] = cfg.clientToken;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: phoneClean, message }),
      signal: controller.signal,
    });
    const text = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        reason: `zapi_${res.status}`,
        status: res.status,
        body: text.slice(0, 500),
      };
    }

    let messageId: string | undefined;
    try {
      const parsed = JSON.parse(text);
      messageId = parsed?.messageId || parsed?.id || parsed?.zaapId;
    } catch {}

    return { ok: true, status: res.status, body: text.slice(0, 500), messageId };
  } catch (e: any) {
    const reason = e?.name === "AbortError" ? "timeout" : `network:${e?.message || "unknown"}`;
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Constrói a mensagem padrão pós-pagamento Limpeza V2 com link da entrega.
 * Idioma básico (PT/EN) baseado no locale do order.
 */
export function buildLimpezaWelcomeMessage(opts: {
  firstName: string;
  deliveryLink: string;
  locale?: string;
}): string {
  const isPt = !opts.locale || opts.locale.startsWith("pt");
  const name = (opts.firstName || "").trim() || (isPt ? "querida alma" : "dear soul");

  if (isPt) {
    return [
      `🕊️ Olá, ${name}!`,
      ``,
      `Aqui é a ATB. Sua sessão espiritual está pronta. ✨`,
      ``,
      `Toque no link abaixo para abrir agora:`,
      opts.deliveryLink,
      ``,
      `Vai chegar em até 5 minutos. Pode abrir e ler com calma.`,
      `Estamos com você. 💛`,
    ].join("\n");
  }

  return [
    `🕊️ Hello, ${name}!`,
    ``,
    `This is ATB. Your spiritual session is ready. ✨`,
    ``,
    `Tap the link below to open it now:`,
    opts.deliveryLink,
    ``,
    `It will arrive within 5 minutes. Take your time to read.`,
    `We are with you. 💛`,
  ].join("\n");
}
