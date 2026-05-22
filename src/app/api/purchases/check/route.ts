// GET /api/purchases/check?email=X
//
// Endpoint pra UX pós-pagamento: cliente aterriza no /obrigado-* e a página
// pode haver chegado ANTES do webhook processar. Aí esse endpoint é chamado
// em poll (a cada 2s) até retornar `{ found: true }`.
//
// Não expõe enumeration — sempre retorna ok=true.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SALE_EVENTS = [
  "order.approved", "order_approved",
  "pergunta1_purchased", "pergunta3_purchased", "pergunta7_purchased",
  "pergunta1_purchased_intl", "pergunta3_purchased_intl", "pergunta7_purchased_intl",
  "limpeza_purchased", "limpeza_v2_purchased", "limpeza_v2_purchased_intl",
  "espirito_purchased", "video_call_purchased",
  "basic_purchased_intl", "premium_purchased_intl",
];

export async function GET(req: Request) {
  const ip = getClientIp(req);
  // Anti-abuse: 60 req/min/IP (suficiente pra polling 30x = 1min)
  const rl = await rateLimit(`purchase-check:${ip}`, 60, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true, found: false });
  }

  const admin = createAdminClient();
  // Procura purchase nos últimos 30min com esse email
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: rows } = await admin
    .from("purchases")
    .select("plan, event, created_at")
    .eq("email", email)
    .in("event", SALE_EVENTS)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (rows && rows.length > 0) {
    return NextResponse.json({ ok: true, found: true, plan: rows[0].plan, event: rows[0].event });
  }
  return NextResponse.json({ ok: true, found: false });
}
