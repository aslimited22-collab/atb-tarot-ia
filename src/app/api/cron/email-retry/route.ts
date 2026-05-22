// POST/GET /api/cron/email-retry
//
// Cron Vercel a cada 10min processa fila email_outbox.
// Auth: Bearer CRON_SECRET ou X-Admin-Secret.
//
// Pra cada email pendente, tenta enviar via Resend. Em falha, bump attempts e
// next_try_at com backoff exponencial. Em sucesso, marca sent_at.

import { NextResponse } from "next/server";
import { processQueue } from "@/lib/email-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function checkAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || "";
  const authHeader = req.headers.get("authorization") || "";
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  const adminSecret = process.env.ADMIN_SECRET || "";
  const adminHeader = req.headers.get("x-admin-secret") || "";
  if (adminSecret && adminHeader === adminSecret) return true;

  return false;
}

async function handler(req: Request): Promise<NextResponse> {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await processQueue(50);
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return handler(req);
}

export async function GET(req: Request) {
  return handler(req);
}
