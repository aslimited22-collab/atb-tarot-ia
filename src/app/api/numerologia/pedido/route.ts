// GET /api/numerologia/pedido?token=... — resolve o pedido pro funil pós-compra.
//
// A página /numerologia/dados chega com ?pedido= que pode ser:
//  - o UUID do nosso orders.id (e-mail com link, Kiwify external_reference), OU
//  - o payment_id do provedor (order_id da Kiwify na página de obrigado,
//    {CHECKOUT_SESSION_ID} do Stripe no success_url).
// O webhook pode demorar alguns segundos — a página faz poll até found=true.
//
// Só expõe o mínimo (sem e-mail/nome completos — endpoint público).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`numerologia-pedido:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();
  if (!token || token.length > 200) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  const admin = createAdminClient();
  const fields = "id, status, birth_date, name";

  // 1) UUID do nosso pedido
  let order: { id: string; status: string; birth_date: string | null; name: string | null } | null = null;
  if (UUID_RE.test(token)) {
    const { data } = await admin
      .from("orders")
      .select(fields)
      .eq("id", token)
      .eq("product_type", "numerologia")
      .maybeSingle();
    order = data;
  }

  // 2) payment_id do provedor (Kiwify order_id / Stripe session id)
  if (!order) {
    const { data } = await admin
      .from("orders")
      .select(fields)
      .eq("payment_id", token)
      .eq("product_type", "numerologia")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    order = data;
  }

  if (!order) {
    // Webhook ainda não processou (ou token inválido) — a página segue no poll.
    return NextResponse.json({ found: false });
  }

  const { data: reading } = await admin
    .from("readings")
    .select("generation_status")
    .eq("order_id", order.id)
    .maybeSingle();

  return NextResponse.json({
    found: true,
    orderId: order.id,
    paid: order.status === "paid",
    needsData: !order.birth_date,
    generated: reading?.generation_status === "completed",
  });
}
