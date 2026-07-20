// GET /numerologia/download/[orderId] — baixa o PDF do mapa numerológico.
// Público por UUID não-adivinhável (mesmo modelo de /entrega/[orderId]).
// Regras: pedido pago + leitura completa + dentro de 30 dias da compra.
// O PDF é regenerado on-the-fly do readings.full_json — sem storage.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/security";
import { buildNumerologiaPdf } from "@/lib/numerologia-pdf";
import type { NumerologiaJson } from "@/lib/numerologia-produto";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const EXPIRY_DAYS = 30;

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`numerologia-download:${ip}`, 20, 60_000);
  if (!rl.ok) return new NextResponse("Too many requests", { status: 429 });

  const orderId = (params.orderId || "").trim();
  if (!UUID_RE.test(orderId)) return new NextResponse("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, name, status, product_type, created_at")
    .eq("id", orderId)
    .eq("product_type", "numerologia")
    .maybeSingle();

  if (!order) return new NextResponse("Not found", { status: 404 });
  if (order.status !== "paid") return new NextResponse("Pagamento não confirmado", { status: 403 });

  const ageMs = Date.now() - new Date(order.created_at).getTime();
  if (ageMs > EXPIRY_DAYS * 24 * 3600 * 1000) {
    return new NextResponse(
      "Este link expirou (30 dias). Fale com a gente pelo WhatsApp que reenviamos o seu mapa.",
      { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const { data: reading } = await admin
    .from("readings")
    .select("full_json, generation_status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!reading?.full_json || reading.generation_status !== "completed") {
    return new NextResponse(
      "Seu mapa ainda está sendo preparado. Tente novamente em alguns minutos.",
      { status: 409, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  try {
    const pdfBytes = await buildNumerologiaPdf(reading.full_json as NumerologiaJson, order.name || "Cliente ATB");
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="numerologia-atb.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logError("numerologia.download", "pdf build failed", {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("Erro ao gerar o PDF. Tente novamente.", { status: 500 });
  }
}
