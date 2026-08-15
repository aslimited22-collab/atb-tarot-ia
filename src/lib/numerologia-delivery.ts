// Entrega do produto Numerologia (R$45) — molde de deliverLimpezaOrder.
//
// Pipeline: garante geração (idempotente via readings) → monta PDF → envia
// e-mail via RESEND DIRETO (a fila email_outbox não suporta anexo/BCC; o SDK
// resend@6 suporta os dois) com o PDF anexo + link de download, BCC pro admin
// em TODA entrega (exigência do brief) → atualiza delivery_status em orders.
//
// Fail-soft: falha de e-mail não explode o webhook — fica delivery_status
// 'failed' + delivery_last_error pra rota de redeliver/admin agir.

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError, logInfo } from "@/lib/logger";
import { generateNumerologiaReading, type NumerologiaJson } from "./numerologia-produto";
import { buildNumerologiaPdf } from "./numerologia-pdf";

// BCC de toda entrega (brief 20/07). ADMIN_NOTIFY_EMAIL já é o padrão do
// projeto pra notificações do dono; fallback hardcoded no e-mail dele.
const BCC_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "aslimited22@gmail.com";

export type NumerologiaDeliverResult = {
  generation: "ok" | "cached" | "failed";
  email: "sent" | "failed" | "skipped";
  finalDeliveryStatus: string;
  error?: string;
};

/**
 * Garante que a leitura de numerologia existe em `readings` (idempotente).
 * Retorna o JSON pronto ou lança em falha de geração.
 */
export async function ensureNumerologiaReading(
  orderId: string,
  name: string,
  birthDate: string
): Promise<{ json: NumerologiaJson; cached: boolean }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("readings")
    .select("full_json, generation_status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing?.full_json && existing.generation_status === "completed") {
    return { json: existing.full_json as NumerologiaJson, cached: true };
  }

  const { json, text } = await generateNumerologiaReading({ name, birthDate });

  if (existing) {
    await admin
      .from("readings")
      .update({
        full_text: text,
        full_json: json,
        generation_status: "completed",
        model_used: "deepseek",
        language: "pt-BR",
        error_message: null,
      })
      .eq("order_id", orderId);
  } else {
    await admin.from("readings").insert({
      order_id: orderId,
      full_text: text,
      full_json: json,
      generation_status: "completed",
      model_used: "deepseek",
      language: "pt-BR",
    });
  }

  return { json, cached: false };
}

/**
 * Entrega completa: geração + PDF + e-mail (anexo, BCC, link de download).
 */
export async function deliverNumerologiaOrder(orderId: string): Promise<NumerologiaDeliverResult> {
  const admin = createAdminClient();

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, name, email, birth_date, status, product_type, delivery_attempts")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { generation: "failed", email: "skipped", finalDeliveryStatus: "failed", error: "order not found" };
  }
  if (order.product_type !== "numerologia") {
    return { generation: "failed", email: "skipped", finalDeliveryStatus: "failed", error: "not a numerologia order" };
  }
  if (order.status !== "paid") {
    return { generation: "failed", email: "skipped", finalDeliveryStatus: "pending", error: "order not paid" };
  }
  if (!order.birth_date || !order.name) {
    // Sem dados ainda — o cron numerologia-dados cobra a cliente. Não é erro.
    return { generation: "failed", email: "skipped", finalDeliveryStatus: "pending", error: "missing customer data" };
  }

  await admin
    .from("orders")
    .update({
      delivery_attempts: (order.delivery_attempts || 0) + 1,
      delivery_last_attempt_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  // 1) Geração (idempotente)
  let json: NumerologiaJson;
  let cached = false;
  try {
    const r = await ensureNumerologiaReading(orderId, order.name, String(order.birth_date));
    json = r.json;
    cached = r.cached;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError("numerologia.delivery", "generation failed", { orderId, error: msg });
    await admin
      .from("readings")
      .upsert({ order_id: orderId, generation_status: "error", error_message: msg }, { onConflict: "order_id" });
    await admin
      .from("orders")
      .update({ delivery_status: "failed", delivery_last_error: `generation: ${msg}` })
      .eq("id", orderId);
    return { generation: "failed", email: "skipped", finalDeliveryStatus: "failed", error: msg };
  }

  // 2) PDF
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildNumerologiaPdf(json, order.name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError("numerologia.delivery", "pdf build failed", { orderId, error: msg });
    await admin
      .from("orders")
      .update({ delivery_status: "failed", delivery_last_error: `pdf: ${msg}` })
      .eq("id", orderId);
    return { generation: cached ? "cached" : "ok", email: "skipped", finalDeliveryStatus: "failed", error: msg };
  }

  // 3) E-mail direto pelo Resend (anexo + BCC — a fila não suporta)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atbtartot.com";
  const downloadLink = `${baseUrl}/numerologia/download/${orderId}`;
  // Escapa entidades HTML: o nome vem da cliente (form público) e é interpolado
  // no corpo HTML do e-mail — sem isso, "<img onerror=...>" no nome viraria
  // markup ativo no cliente de e-mail.
  const firstName = order.name
    .split(" ")[0]
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const html = `
  <div style="background:#120025;padding:32px 16px;font-family:Georgia,serif;">
    <div style="max-width:560px;margin:0 auto;background:#1e0040;border:1px solid #e8b84b;border-radius:16px;padding:32px 24px;color:#f5f0ff;">
      <div style="text-align:center;color:#e8b84b;letter-spacing:0.3em;font-size:22px;font-weight:bold;">ATB</div>
      <h1 style="font-size:22px;color:#f6d67e;text-align:center;margin:18px 0;">Seu mapa de Numerologia chegou, ${firstName} ✨</h1>
      <p style="line-height:1.7;color:#e2d9f3;">Seu mapa numerológico pessoal — feito a partir do seu nome completo e da sua data de nascimento — está pronto, com carinho.</p>
      <div style="background:#2a0055;border:1px solid rgba(232,184,75,0.5);border-radius:12px;padding:16px;text-align:center;margin:20px 0;">
        <div style="font-size:12px;color:#c4b5fd;text-transform:uppercase;letter-spacing:0.1em;">Seus números da sorte</div>
        <div style="font-size:26px;color:#e8b84b;font-weight:bold;letter-spacing:0.15em;margin-top:6px;">${(json.numeros_da_sorte || []).join(" · ")}</div>
      </div>
      <p style="line-height:1.7;color:#e2d9f3;">O mapa completo — com o significado de cada número e como usar cada um — está no <b style="color:#f6d67e;">PDF anexo</b> neste e-mail. Você também pode baixar quando quiser:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${downloadLink}" style="background:linear-gradient(135deg,#f6d67e,#e8b84b);color:#3a2400;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:12px;display:inline-block;">📥 Baixar meu mapa em PDF</a>
      </div>
      <p style="font-size:12px;color:#9575cd;line-height:1.6;">O link fica disponível por 30 dias. Guarde o PDF com carinho. Este mapa é uma orientação espiritual e reflexiva — não substitui aconselhamento profissional.</p>
    </div>
    <div style="text-align:center;color:#9575cd;font-size:11px;margin-top:16px;">ATB — atbtartot.com</div>
  </div>`;

  try {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "ATB <atb@atbtartot.com>";
    const result = await resend.emails.send({
      from: fromEmail,
      to: order.email,
      bcc: BCC_EMAIL,
      subject: `✨ ${firstName}, seu mapa de Numerologia da ATB chegou`,
      html,
      attachments: [
        {
          filename: "numerologia-atb.pdf",
          content: Buffer.from(pdfBytes),
        },
      ],
    });
    if (result?.error) throw new Error(result.error.message || "resend error");

    await admin
      .from("orders")
      .update({
        delivery_status: "email_sent",
        delivery_email_sent_at: new Date().toISOString(),
        delivery_last_error: null,
      })
      .eq("id", orderId);

    logInfo("numerologia.delivery", "delivered", { orderId, cached, to: order.email });
    return { generation: cached ? "cached" : "ok", email: "sent", finalDeliveryStatus: "email_sent" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError("numerologia.delivery", "email failed", { orderId, error: msg });
    await admin
      .from("orders")
      .update({ delivery_status: "failed", delivery_last_error: `email: ${msg}` })
      .eq("id", orderId);
    return { generation: cached ? "cached" : "ok", email: "failed", finalDeliveryStatus: "failed", error: msg };
  }
}
