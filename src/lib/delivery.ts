// Pipeline de entrega pós-pagamento da Limpeza V2.
// Centraliza: dispara geração + envia email + envia WhatsApp + atualiza delivery_status.
// Cada passo é registrado com logger estruturado e marcado em orders.delivery_*.

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { sendWhatsAppText, buildLimpezaWelcomeMessage, isZApiConfigured } from "@/lib/zapi";

function escapeHtml(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Envia email Resend com logging estruturado em todo passo. Não toca em
 * tabela orders — usado pelos fluxos V1 (Kiwify limpeza/espirito) onde o
 * registro fica em `purchases` e não há `delivery_status`.
 *
 * Retorna `{ ok, reason? }` — fail-soft.
 */
export type EmailLogResult = { ok: boolean; reason?: string };

export async function sendCustomerEmailWithLog(opts: {
  scope: string;          // ex: "webhook.kiwify.v1.limpeza"
  to: string;
  subject: string;
  html: string;
  refId?: string;         // ex: orderId Kiwify, para correlacionar logs
}): Promise<EmailLogResult> {
  const { scope, to, subject, html, refId } = opts;
  if (!to) {
    return { ok: false, reason: "no_email" };
  }
  // Enfileira em email_outbox: tenta enviar imediato; se falhar, worker retry
  // a cada 10min com backoff exponencial até 6 tentativas.
  // Antes: send direto Resend → falha silenciosa em validation_error etc.
  try {
    const { enqueueEmail } = await import("@/lib/email-queue");
    await enqueueEmail({ to, subject, html, scope, refId, sendNow: true });
    // Mesmo se sendNow falhar, retornamos ok=true porque ficou enfileirado pra retry
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    logError(scope, "enqueue exception", { refId, to, error: e });
    return { ok: false, reason: `enqueue_exception:${msg}` };
  }
}

export type DeliverInput = {
  orderId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  locale?: string | null;
  deliveryLink: string;       // ex: https://atbtartot.com/entrega/{orderId}
  triggerGeneration?: boolean; // default true
  internalGenUrl?: string;     // injetado por quem chama (host da request)
};

export type DeliverResult = {
  generation: { ok: boolean; reason?: string; status?: number };
  email: { ok: boolean; reason?: string };
  whatsapp: { ok: boolean; reason?: string };
  finalDeliveryStatus:
    | "pending"
    | "email_sent"
    | "whatsapp_sent"
    | "both_sent"
    | "failed"
    | "manual_review";
};

/**
 * Executa a entrega de forma idempotente. Cada falha é logada mas não trava
 * o pipeline. Ao final, marca delivery_status com o melhor estado alcançado.
 */
export async function deliverLimpezaOrder(input: DeliverInput): Promise<DeliverResult> {
  const admin = createAdminClient();
  const scope = "delivery.limpeza";
  const orderId = input.orderId;

  // Marca início da tentativa (não quebra se update falhar)
  const nowIso = new Date().toISOString();
  try {
    const { data: cur } = await admin
      .from("orders")
      .select("delivery_attempts")
      .eq("id", orderId)
      .maybeSingle();
    const attempts = Number(cur?.delivery_attempts || 0) + 1;
    await admin
      .from("orders")
      .update({
        delivery_attempts: attempts,
        delivery_last_attempt_at: nowIso,
      })
      .eq("id", orderId);
  } catch (e) {
    logWarn(scope, "could not increment delivery_attempts", { orderId, error: String(e) });
  }

  // ─── 1. Geração da leitura ────────────────────────────────────
  let generation: DeliverResult["generation"] = { ok: false, reason: "skipped" };
  if (input.triggerGeneration !== false && input.internalGenUrl) {
    try {
      logInfo(scope, "triggering generation", { orderId });
      const res = await fetch(input.internalGenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": process.env.INTERNAL_GEN_TOKEN || "",
        },
        body: JSON.stringify({ orderId }),
      });
      const okGen = res.ok;
      generation = { ok: okGen, status: res.status, reason: okGen ? undefined : `gen_http_${res.status}` };
      if (!okGen) {
        const txt = await res.text().catch(() => "");
        logError(scope, "generation http error", { orderId, status: res.status, body: txt.slice(0, 200) });
      } else {
        logInfo(scope, "generation ok", { orderId, status: res.status });
      }
    } catch (e: any) {
      generation = { ok: false, reason: `gen_network:${e?.message || "unknown"}` };
      logError(scope, "generation network error", { orderId, error: e });
    }
  }

  // Carrega a leitura completa recém-gerada pra ENTREGAR o produto DENTRO do
  // e-mail — público 60+ não navega no site: abre o e-mail e já lê a limpeza.
  // A geração acima é aguardada (await), então o full_text já está salvo.
  let readingText: string | null = null;
  try {
    const { data: rd } = await admin
      .from("readings")
      .select("full_text")
      .eq("order_id", orderId)
      .maybeSingle();
    const ft = (rd?.full_text || "").trim();
    readingText = ft.length > 0 ? ft : null;
  } catch (e) {
    logWarn(scope, "could not load reading for email body", { orderId, error: String(e) });
  }

  // ─── 2. Email Resend ──────────────────────────────────────────
  let email: DeliverResult["email"] = { ok: false, reason: "not_attempted" };
  if (process.env.RESEND_API_KEY && input.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "ATB <atb@atbtartot.com>";
      const firstName = ((input.name || "").split(" ")[0] || "querida alma").trim();
      const isPt = !input.locale || input.locale.startsWith("pt");

      const subject = isPt
        ? "🕊️ Sua Limpeza Espiritual está aqui, minha filha"
        : "🕊️ Your Spiritual Cleansing is here";

      const greeting = isPt
        ? `Olá, <strong style="color:#f5c860;">${escapeHtml(firstName)}</strong>! A ATB preparou a sua limpeza com muito carinho. Ela está aqui embaixo — é só ler com calma. 🕊️`
        : `Hello, <strong style="color:#f5c860;">${escapeHtml(firstName)}</strong>! ATB prepared your cleansing with care. It's right below — read it calmly. 🕊️`;

      // Entrega o PRODUTO dentro do e-mail: a leitura completa em parágrafos
      // grandes e legíveis (público 60+ abre a caixa de entrada e já tem tudo).
      // Se por algum motivo a leitura não estiver pronta, cai no botão do site.
      const readingHtml = readingText
        ? readingText
            .split(/\n{2,}|\r?\n/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => `<p style="color:#fbf8ff;font-size:19px;line-height:1.8;margin:0 0 18px;">${escapeHtml(p)}</p>`)
            .join("")
        : "";

      const cta = isPt ? "✨ Abrir também no site" : "✨ Also open on the site";
      const saveTitle = isPt ? "💛 Guarde este e-mail" : "💛 Save this email";
      const saveDesc = isPt
        ? "A sua limpeza fica guardada aqui neste e-mail — pode voltar a ler sempre que quiser. Se preferir, também está em <strong style=\"color:#e8b84b\">atbtartot.com</strong> com este mesmo endereço."
        : "Your cleansing is saved right here in this email — read it whenever you want. It's also at <strong style=\"color:#e8b84b\">atbtartot.com</strong> with this same address.";

      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
<div style="max-width:600px;margin:0 auto;padding:30px 20px;">
  <div style="background:linear-gradient(135deg,#1e0040,#2a0055,#1e0040);border-radius:20px;padding:34px 26px;text-align:center;border:2px solid rgba(232,184,75,0.4);">
    <div style="font-size:64px;margin-bottom:12px;">🕊️</div>
    <h1 style="font-family:Georgia,serif;color:#e8b84b;font-size:30px;margin:0 0 14px;line-height:1.15;">${isPt ? "Sua limpeza está pronta" : "Your cleansing is ready"}</h1>
    <p style="color:#fbf8ff;font-size:19px;line-height:1.65;margin:0;">${greeting}</p>
    ${readingHtml
      ? `<div style="margin-top:22px;background:rgba(18,0,37,0.55);border:2px solid rgba(232,184,75,0.45);border-radius:16px;padding:26px 24px;text-align:left;">${readingHtml}</div>`
      : `<a href="${escapeHtml(input.deliveryLink)}" style="display:inline-block;margin-top:22px;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:20px;padding:20px 36px;border-radius:14px;text-decoration:none;box-shadow:0 8px 24px rgba(232,184,75,0.4);">${isPt ? "✨ Abrir minha sessão" : "✨ Open my session"}</a>`}
  </div>
  ${readingHtml
    ? `<div style="text-align:center;margin-top:16px;"><a href="${escapeHtml(input.deliveryLink)}" style="display:inline-block;color:#e8b84b;font-weight:700;font-size:16px;text-decoration:underline;padding:12px;">${cta}</a></div>`
    : ""}
  <div style="margin-top:16px;padding:18px 20px;background:rgba(126,232,248,0.08);border:1.5px solid rgba(126,232,248,0.32);border-radius:14px;color:#fbf8ff;text-align:left;">
    <div style="font-size:17px;font-weight:700;color:#7ee8f8;margin-bottom:8px;line-height:1.3;">${saveTitle}</div>
    <div style="font-size:16px;line-height:1.6;font-weight:500;">${saveDesc}</div>
  </div>
</div></body></html>`;

      const result = await resend.emails.send({
        from: fromEmail,
        to: input.email,
        subject,
        html,
      });

      // Resend retorna { data, error }
      const resErr = (result as any)?.error;
      if (resErr) {
        email = { ok: false, reason: `resend_error:${resErr.name || resErr.message || "unknown"}` };
        logError(scope, "resend returned error", { orderId, error: resErr });
      } else {
        email = { ok: true };
        logInfo(scope, "email sent", { orderId, to: input.email, id: (result as any)?.data?.id });
      }
    } catch (e: any) {
      email = { ok: false, reason: `email_exception:${e?.message || "unknown"}` };
      logError(scope, "email exception", { orderId, error: e });
    }
  } else if (!process.env.RESEND_API_KEY) {
    email = { ok: false, reason: "resend_not_configured" };
    logWarn(scope, "RESEND_API_KEY not set, skipping email", { orderId });
  } else {
    email = { ok: false, reason: "no_email" };
  }

  // ─── 3. WhatsApp Z-API ────────────────────────────────────────
  let whatsapp: DeliverResult["whatsapp"] = { ok: false, reason: "not_attempted" };
  if (isZApiConfigured() && input.phone) {
    const message = buildLimpezaWelcomeMessage({
      firstName: (input.name || "").split(" ")[0] || "querida alma",
      deliveryLink: input.deliveryLink,
      locale: input.locale ?? undefined,
    });
    const r = await sendWhatsAppText(input.phone, message);
    whatsapp = { ok: r.ok, reason: r.reason };
    if (r.ok) {
      logInfo(scope, "whatsapp sent", { orderId, phone: input.phone, messageId: r.messageId });
    } else {
      logWarn(scope, "whatsapp failed", { orderId, phone: input.phone, reason: r.reason, status: r.status });
    }
  } else if (!isZApiConfigured()) {
    whatsapp = { ok: false, reason: "zapi_not_configured" };
  } else {
    whatsapp = { ok: false, reason: "no_phone" };
  }

  // ─── 4. Status final ──────────────────────────────────────────
  let finalDeliveryStatus: DeliverResult["finalDeliveryStatus"] = "pending";
  if (email.ok && whatsapp.ok) finalDeliveryStatus = "both_sent";
  else if (email.ok) finalDeliveryStatus = "email_sent";
  else if (whatsapp.ok) finalDeliveryStatus = "whatsapp_sent";
  else finalDeliveryStatus = "failed";

  // Persiste status + erro consolidado
  try {
    const errors: string[] = [];
    if (!generation.ok) errors.push(`gen:${generation.reason}`);
    if (!email.ok) errors.push(`email:${email.reason}`);
    if (!whatsapp.ok && whatsapp.reason !== "zapi_not_configured" && whatsapp.reason !== "no_phone") {
      errors.push(`wa:${whatsapp.reason}`);
    }

    const patch: Record<string, any> = {
      delivery_status: finalDeliveryStatus,
      delivery_last_error: errors.length ? errors.join(" | ").slice(0, 500) : null,
    };
    if (email.ok) patch.delivery_email_sent_at = nowIso;
    if (whatsapp.ok) patch.delivery_whatsapp_sent_at = nowIso;

    await admin.from("orders").update(patch).eq("id", orderId);
    logInfo(scope, "delivery completed", { orderId, finalDeliveryStatus, errors: errors.length });
  } catch (e) {
    logError(scope, "could not persist delivery_status", { orderId, error: e });
  }

  return { generation, email, whatsapp, finalDeliveryStatus };
}
