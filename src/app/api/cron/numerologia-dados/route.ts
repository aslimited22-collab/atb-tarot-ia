// Cron: cobra nome+nascimento de pedidos de Numerologia pagos há 1h+ sem dados.
// (O webhook já manda o link na hora da compra; isto é a rede de segurança.)
// Vercel Hobby = 1x/dia. Anti-respam: marca orders.data_request_sent_at.
//
// Auth (molde email-retry): Authorization: Bearer CRON_SECRET (Vercel Cron)
// ou X-Admin-Secret (curl/script manual).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function checkAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || "";
  const authHeader = req.headers.get("authorization") || "";
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const adminSecret = process.env.ADMIN_SECRET || "";
  if (adminSecret && req.headers.get("x-admin-secret") === adminSecret) return true;
  return false;
}

async function handler(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://atbtartot.com";

  const { data: pending, error } = await admin
    .from("orders")
    .select("id, email, name")
    .eq("product_type", "numerologia")
    .eq("status", "paid")
    .is("birth_date", null)
    .is("data_request_sent_at", null)
    .lte("created_at", oneHourAgo)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let sent = 0;
  for (const order of pending) {
    const firstName = (order.name || "querida alma").split(" ")[0];
    const link = `${baseUrl}/numerologia/dados?pedido=${order.id}`;
    const r = await sendCustomerEmailWithLog({
      scope: "cron.numerologia-dados",
      to: order.email,
      subject: `${firstName}, seu mapa de Numerologia está esperando por você 🔢`,
      html: `
<div style="max-width:560px;margin:0 auto;padding:30px 20px;background:#120025;font-family:Georgia,serif;color:#fbf8ff;">
  <div style="background:linear-gradient(135deg,#1e0040,#2a0055);border-radius:20px;padding:36px 24px;text-align:center;border:2px solid rgba(232,184,75,0.5);">
    <div style="font-size:56px;margin-bottom:12px;">🔢</div>
    <h1 style="color:#e8b84b;font-size:26px;margin:0 0 12px;">Falta só 1 passo, ${firstName}!</h1>
    <p style="color:#fbf8ff;font-size:17px;line-height:1.65;margin:0 0 22px;">
      Seu pagamento está confirmado, mas a ATB ainda precisa do seu
      <strong style="color:#f5c860;">nome completo</strong> e da sua
      <strong style="color:#f5c860;">data de nascimento</strong> pra preparar o seu mapa.
    </p>
    <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#e8b84b,#c9950a);color:#120025;font-weight:800;font-size:18px;padding:18px 32px;border-radius:14px;text-decoration:none;">✨ Preencher agora (1 minuto)</a>
    <p style="color:#c4b5fd;font-size:13px;margin:20px 0 0;">Assim que você preencher, seu mapa chega em PDF neste e-mail.</p>
  </div>
  <div style="text-align:center;margin-top:16px;color:#9575cd;font-size:12px;">ATB · atbtartot.com</div>
</div>`,
      refId: order.id,
    });
    if (r.ok) {
      await admin.from("orders").update({ data_request_sent_at: new Date().toISOString() }).eq("id", order.id);
      sent++;
    }
  }

  logInfo("cron.numerologia-dados", "batch done", { pending: pending.length, sent });
  return NextResponse.json({ ok: true, processed: pending.length, sent });
}

export async function GET(req: Request) {
  return handler(req);
}
export async function POST(req: Request) {
  return handler(req);
}
