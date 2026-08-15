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

// Página de aviso com a cara do site (público 45+ clica no botão cedo demais e
// caía num text/plain cru do navegador). Auto-refresh quando for "aguarde".
function noticeHtml(title: string, body: string, refreshSeconds?: number) {
  const refresh = refreshSeconds ? `<meta http-equiv="refresh" content="${refreshSeconds}">` : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">${refresh}
<title>${title} — ATB</title></head>
<body style="margin:0;background:#120025;color:#f5f0ff;font-family:Georgia,serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center">
<div style="max-width:460px">
<div style="color:#e8b84b;font-size:1.4rem;letter-spacing:0.28em;font-weight:700;margin-bottom:24px">ATB</div>
<h1 style="color:#f6d67e;font-size:1.5rem;margin:0 0 14px">${title}</h1>
<p style="color:#c4b5fd;font-size:1.05rem;line-height:1.65;margin:0 0 24px">${body}</p>
<a href="javascript:location.reload()" style="display:inline-block;background:linear-gradient(135deg,#f6d67e,#e8b84b);color:#3a2400;font-weight:700;padding:14px 28px;border-radius:14px;text-decoration:none">🔄 Tentar de novo</a>
</div></body></html>`;
}

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
      noticeHtml("Este link expirou", "Links de download valem por 30 dias. Fale com a gente que reenviamos o seu mapa com carinho."),
      { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const { data: reading } = await admin
    .from("readings")
    .select("full_json, generation_status")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!reading?.full_json || reading.generation_status !== "completed") {
    return new NextResponse(
      noticeHtml(
        "Seu mapa está sendo preparado ✨",
        "A ATB está finalizando o seu mapa de Numerologia. Esta página atualiza sozinha — ou volte em alguns minutos. Ele também chega no seu e-mail.",
        20
      ),
      { status: 409, headers: { "Content-Type": "text/html; charset=utf-8" } }
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
