// POST /api/numerologia/dados — cliente preenche nome completo + nascimento
// depois de pagar. Grava no pedido e dispara a entrega (geração + PDF +
// e-mail) na hora, aguardando o resultado (DeepSeek ~15-30s; maxDuration 60).
//
// Endpoint público (pós-compra por token UUID) — mesmas defesas do
// /api/limpeza/preview: rate-limit por IP, cap de body, sanitize.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp, sanitizeInput } from "@/lib/security";
import { deliverNumerologiaOrder } from "@/lib/numerologia-delivery";
import { logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f-]{36}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPlausibleBirthDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const year = d.getUTCFullYear();
  const now = new Date().getUTCFullYear();
  return year >= 1900 && year <= now; // sem data futura/absurda
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`numerologia-dados:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > 4_000) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 413 });
  }

  let body: { orderId?: string; full_name?: string; birth_date?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const orderId = (body.orderId || "").trim();
  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const nameCheck = sanitizeInput(body.full_name || "", 120);
  if (!nameCheck.ok || nameCheck.value.trim().length < 5 || !nameCheck.value.trim().includes(" ")) {
    return NextResponse.json(
      { error: "Escreva seu nome completo (nome e sobrenome), do jeito que está nos seus documentos." },
      { status: 400 }
    );
  }

  const birthDate = (body.birth_date || "").trim();
  if (!isPlausibleBirthDate(birthDate)) {
    return NextResponse.json({ error: "Data de nascimento inválida." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, product_type")
    .eq("id", orderId)
    .eq("product_type", "numerologia")
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: "O pagamento deste pedido ainda não foi confirmado." }, { status: 409 });
  }

  const { error: updErr } = await admin
    .from("orders")
    .update({ name: nameCheck.value.trim(), birth_date: birthDate })
    .eq("id", orderId);

  if (updErr) {
    logError("numerologia.dados", "update failed", { orderId, error: updErr.message });
    return NextResponse.json({ error: "Não conseguimos salvar. Tente de novo." }, { status: 500 });
  }

  logInfo("numerologia.dados", "customer data saved", { orderId });

  // Entrega na hora (geração + PDF + e-mail). Fail-soft: se falhar, o pedido
  // fica delivery_status=failed e o admin pode reentregar; a cliente vê
  // mensagem de "chega em até 24h" de qualquer forma.
  const result = await deliverNumerologiaOrder(orderId).catch((err) => {
    logError("numerologia.dados", "delivery threw", {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  return NextResponse.json({
    ok: true,
    delivered: result?.email === "sent",
  });
}
