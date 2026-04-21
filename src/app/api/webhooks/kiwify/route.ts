import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyKiwifySignature, planFromValue } from "@/lib/kiwify";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature =
    req.headers.get("x-kiwify-signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("signature");

  if (!verifyKiwifySignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event: string = payload.event || payload.webhook_event_type || payload.type || "";
  const email: string | undefined =
    payload.Customer?.email || payload.customer?.email || payload.email || payload.data?.customer?.email;
  const orderId: string | undefined =
    payload.order_id || payload.Order?.order_id || payload.data?.order_id;
  const valueCents: number =
    Number(payload.Commissions?.charge_amount ?? payload.charge_amount ?? payload.amount ?? payload.value ?? 0);
  const valueBRL = valueCents > 1000 ? valueCents / 100 : valueCents;

  if (!email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (event === "order.approved" || event === "order_approved") {
    const plan = planFromValue(valueBRL);
    await admin.from("users").update({ plan, kiwify_order_id: orderId ?? null }).eq("email", email);
    return NextResponse.json({ ok: true, plan });
  }

  if (
    event === "order.refunded" ||
    event === "order_refunded" ||
    event === "subscription.canceled" ||
    event === "subscription_canceled"
  ) {
    await admin.from("users").update({ plan: "free" }).eq("email", email);
    return NextResponse.json({ ok: true, plan: "free" });
  }

  return NextResponse.json({ ok: true, ignored: event });
}
