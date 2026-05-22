// POST /api/admin/email-retry/[id]
// Admin manual: força reenvio de um email da fila imediatamente.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processQueue } from "@/lib/email-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  // Reseta next_try_at pra now e attempts (mantém histórico via last_error)
  const { error } = await admin
    .from("email_outbox")
    .update({ next_try_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Processa imediatamente
  const result = await processQueue(1);
  return NextResponse.json({ ok: true, ...result });
}
