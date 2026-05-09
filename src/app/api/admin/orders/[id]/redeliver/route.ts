// Endpoint admin para reenviar manualmente uma entrega Limpeza V2.
// Autenticado via header X-Admin-Secret comparado a process.env.ADMIN_SECRET.
//
// Uso:
//   curl -X POST https://atbtartot.com/api/admin/orders/<uuid>/redeliver \
//        -H "X-Admin-Secret: $ADMIN_SECRET"
//
// Resposta: JSON com DeliverResult (generation/email/whatsapp/finalDeliveryStatus).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverLimpezaOrder } from "@/lib/delivery";
import { logInfo, logWarn, logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const scope = "admin.redeliver";
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    logError(scope, "ADMIN_SECRET not configured");
    return NextResponse.json({ error: "admin secret not configured" }, { status: 500 });
  }

  const provided = req.headers.get("x-admin-secret") || "";
  if (provided !== adminSecret) {
    logWarn(scope, "unauthorized attempt", { id: params.id });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orderId = params.id;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json({ error: "invalid order id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("id, status, email, name, phone, locale, product_type")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    logError(scope, "supabase select error", { orderId, error: error.message });
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  if (order.product_type !== "limpeza_espiritual") {
    return NextResponse.json({ error: "not a limpeza order" }, { status: 400 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: `order status is '${order.status}', expected 'paid'` }, { status: 400 });
  }

  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "atbtartot.com";

  logInfo(scope, "manual redeliver triggered", { orderId });

  const result = await deliverLimpezaOrder({
    orderId: order.id,
    email: (order.email || "").toLowerCase(),
    name: order.name,
    phone: order.phone,
    locale: order.locale,
    deliveryLink: `${proto}://${host}/entrega/${order.id}`,
    internalGenUrl: `${proto}://${host}/api/limpeza/generate`,
    triggerGeneration: true,
  });

  logInfo(scope, "manual redeliver done", {
    orderId,
    finalDeliveryStatus: result.finalDeliveryStatus,
    gen: result.generation.ok,
    email: result.email.ok,
    wa: result.whatsapp.ok,
  });

  return NextResponse.json({ ok: true, orderId: order.id, result });
}
