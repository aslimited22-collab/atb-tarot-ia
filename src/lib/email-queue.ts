// Email queue com retry exponencial — resolve Resend silenciosamente falhando.
//
// Uso:
//   await enqueueEmail({ to, subject, html, scope, refId });
//   // Worker processa via cron /api/cron/email-retry */10 * * * *
//
// Backoff por número de tentativas (em segundos):
//   0 falhas → tenta imediato (next_try_at = now)
//   1 falha  → +60s
//   2 falhas → +300s (5min)
//   3 falhas → +1800s (30min)
//   4 falhas → +7200s (2h)
//   5 falhas → +21600s (6h)
//   6+ falhas → desiste (next_try_at fica fixo, marcado como morto)

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { logInfo, logWarn, logError } from "@/lib/logger";

type AdminClient = ReturnType<typeof createAdminClient>;

const BACKOFF_SECONDS = [0, 60, 300, 1800, 7200, 21600]; // attempts 0-5
const MAX_ATTEMPTS = 6;

export type EnqueueEmailInput = {
  to: string;
  subject: string;
  html: string;
  scope: string;
  refId?: string;
  /** Se true, tenta enviar imediatamente após enfileirar (default true). */
  sendNow?: boolean;
};

/**
 * Enfileira um email pra envio. Por padrão tenta enviar imediatamente.
 * Se falhar, o cron email-retry vai tentar de novo com backoff.
 */
export async function enqueueEmail(input: EnqueueEmailInput): Promise<{ id: string; sentNow: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_outbox")
    .insert({
      to_email: input.to.toLowerCase().trim(),
      subject: input.subject,
      html: input.html,
      scope: input.scope,
      ref_id: input.refId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    logError(input.scope, "enqueue failed", { error: error?.message, to: input.to });
    throw new Error(`enqueue failed: ${error?.message}`);
  }

  const id = data.id;

  // Tenta enviar imediatamente (default). Se falhar, fica na fila pro worker.
  if (input.sendNow !== false) {
    await tryDeliver(admin, id);
  }

  return { id, sentNow: input.sendNow !== false };
}

/**
 * Worker: processa próximos emails pendentes. Chamado pelo cron a cada 10min.
 */
export async function processQueue(limit = 50): Promise<{ processed: number; sent: number; failed: number }> {
  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("email_outbox")
    .select("id")
    .is("sent_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .lte("next_try_at", new Date().toISOString())
    .order("next_try_at", { ascending: true })
    .limit(limit);

  if (error) {
    logError("email-queue.worker", "fetch failed", { error: error.message });
    return { processed: 0, sent: 0, failed: 0 };
  }

  if (!pending || pending.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const row of pending) {
    const ok = await tryDeliver(admin, row.id);
    if (ok) sent++;
    else failed++;
  }

  logInfo("email-queue.worker", "batch done", { processed: pending.length, sent, failed });
  return { processed: pending.length, sent, failed };
}

/**
 * Tenta entregar UM email da fila. Marca sent_at em sucesso ou bumps attempts em falha.
 */
async function tryDeliver(admin: AdminClient, id: string): Promise<boolean> {
  const { data: row, error: fetchErr } = await admin
    .from("email_outbox")
    .select("id, to_email, subject, html, scope, ref_id, attempts")
    .eq("id", id)
    .single();

  if (fetchErr || !row) {
    logWarn("email-queue", "fetch row failed", { id, error: fetchErr?.message });
    return false;
  }

  if (!process.env.RESEND_API_KEY) {
    logWarn(row.scope, "RESEND_API_KEY not set", { id, to: row.to_email });
    await markFailed(admin, id, row.attempts, "resend_not_configured");
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const result = await resend.emails.send({
      from: fromEmail,
      to: row.to_email,
      subject: row.subject,
      html: row.html,
    });
    const resErr = (result as { error?: { name?: string; message?: string } | null })?.error;
    if (resErr) {
      const reason = `${resErr.name || ""}:${resErr.message || "unknown"}`.slice(0, 200);
      logError(row.scope, "resend returned error", { id, to: row.to_email, error: resErr });
      await markFailed(admin, id, row.attempts, reason);
      return false;
    }
    const resendId = (result as { data?: { id?: string } })?.data?.id;
    await admin
      .from("email_outbox")
      .update({ sent_at: new Date().toISOString(), resend_id: resendId ?? null, last_error: null })
      .eq("id", id);
    logInfo(row.scope, "email sent via queue", { id, to: row.to_email, resendId });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logError(row.scope, "delivery exception", { id, to: row.to_email, error: msg });
    await markFailed(admin, id, row.attempts, msg.slice(0, 200));
    return false;
  }
}

async function markFailed(admin: AdminClient, id: string, currentAttempts: number, error: string): Promise<void> {
  const newAttempts = currentAttempts + 1;
  // Backoff: se atingiu max attempts, deixa next_try_at distante pra não tentar mais
  const backoffSec = newAttempts >= MAX_ATTEMPTS
    ? 365 * 24 * 3600
    : BACKOFF_SECONDS[newAttempts] ?? 21600;
  const nextTry = new Date(Date.now() + backoffSec * 1000).toISOString();
  await admin
    .from("email_outbox")
    .update({ attempts: newAttempts, next_try_at: nextTry, last_error: error })
    .eq("id", id);
}
