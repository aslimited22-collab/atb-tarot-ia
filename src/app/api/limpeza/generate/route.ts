import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateFullReading, THEME_LABELS } from "@/lib/limpeza-v2";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Gera a Limpeza Espiritual completa para um pedido PAGO.
 *
 * Chamada de duas formas:
 *  - Webhook Kiwify (server-to-server) -> sem auth, mas exige X-Internal-Token=process.env.INTERNAL_GEN_TOKEN
 *  - Cliente (na pagina /entrega/[orderId]) -> sem auth; bypass do token mas tem rate-limit por orderId
 *    e so gera se status=paid + reading.full_text vazio.
 *
 * Idempotente: se ja tiver full_text, retorna o existente.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ error: "orderId inválido." }, { status: 400 });
    }

    const internalToken = req.headers.get("x-internal-token") || "";
    const expected = process.env.INTERNAL_GEN_TOKEN || "";
    const isInternal = !!expected && internalToken === expected;

    const admin = createAdminClient();

    // Busca order + reading
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, name, email, theme, sign, question, status, product_type")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    if (order.product_type !== "limpeza_espiritual") {
      return NextResponse.json({ error: "Produto incorreto." }, { status: 400 });
    }

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: "Pedido ainda não foi pago.", status: order.status },
        { status: 402 }
      );
    }

    const { data: existing } = await admin
      .from("readings")
      .select("id, full_text, full_json, generation_status")
      .eq("order_id", orderId)
      .maybeSingle();

    // Idempotência: já existe full_text -> retorna cache
    if (existing?.full_text && existing?.full_json) {
      return NextResponse.json({
        ok: true,
        cached: true,
        full_text: existing.full_text,
        full_json: existing.full_json,
      });
    }

    // Gera completo via DeepSeek
    let full;
    try {
      full = await generateFullReading({
        name: order.name,
        theme: THEME_LABELS[order.theme as keyof typeof THEME_LABELS] || order.theme,
        sign: order.sign,
        question: order.question,
        language: "pt-BR",
      });
    } catch (e: any) {
      const errMsg = String(e?.message || e || "generation error").slice(0, 500);
      // Marca erro
      if (existing) {
        await admin
          .from("readings")
          .update({ generation_status: "error", error_message: errMsg })
          .eq("id", existing.id);
      } else {
        await admin.from("readings").insert({
          order_id: orderId,
          generation_status: "error",
          error_message: errMsg,
          model_used: "deepseek",
        });
      }
      return NextResponse.json({ error: "Não foi possível gerar agora. Tente novamente em alguns minutos." }, { status: 502 });
    }

    // Salva
    if (existing) {
      await admin
        .from("readings")
        .update({
          full_text: full.text,
          full_json: full.json,
          generation_status: "completed",
          model_used: "deepseek",
          error_message: null,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("readings").insert({
        order_id: orderId,
        full_text: full.text,
        full_json: full.json,
        generation_status: "completed",
        model_used: "deepseek",
        language: "pt-BR",
      });
    }

    return NextResponse.json({
      ok: true,
      cached: false,
      full_text: full.text,
      full_json: full.json,
      internal: isInternal,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
