// POST /api/numerologia/generate — (re)gera a leitura de um pedido pago.
// Server-to-server (X-Internal-Token) ou admin (X-Admin-Secret). Idempotente:
// leitura já completa retorna cache. Molde: /api/limpeza/generate.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureNumerologiaReading } from "@/lib/numerologia-delivery";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f-]{36}$/i;

function isAuthorized(req: Request): boolean {
  const internal = process.env.INTERNAL_GEN_TOKEN || "";
  if (internal && req.headers.get("x-internal-token") === internal) return true;
  const adminSecret = process.env.ADMIN_SECRET || "";
  if (adminSecret && req.headers.get("x-admin-secret") === adminSecret) return true;
  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const orderId = (body.orderId || "").trim();
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ error: "invalid orderId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, name, birth_date, status, product_type")
    .eq("id", orderId)
    .eq("product_type", "numerologia")
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "order not found" }, { status: 404 });
  if (order.status !== "paid") return NextResponse.json({ error: "order not paid" }, { status: 409 });
  if (!order.birth_date || !order.name) {
    return NextResponse.json({ error: "missing customer data" }, { status: 409 });
  }

  try {
    const { cached } = await ensureNumerologiaReading(orderId, order.name, String(order.birth_date));
    return NextResponse.json({ ok: true, cached });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError("numerologia.generate", "generation failed", { orderId, error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
