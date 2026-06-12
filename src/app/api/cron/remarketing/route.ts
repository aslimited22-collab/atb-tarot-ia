// POST/GET /api/cron/remarketing
//
// Remarketing pra quem NÃO comprou (mesmo padrão de auth do cron follow-up):
//   1. Vercel Cron (diário 10h BRT) → `Authorization: Bearer ${CRON_SECRET}`
//   2. Scripts → header `X-Admin-Secret: ${ADMIN_SECRET}`
//   3. Botão no /admin/insights → sessão Supabase de admin
//
// Passada A — LEADS (checkout não concluído):
//   leads sem e-mail enviado e sem conversão, criados entre 2h e 7d atrás.
//   2h dá tempo do Pix/boleto ser pago (não cutucamos quem está pagando).
//   Se o e-mail comprou DEPOIS do lead → marca converted_at e pula.
//   (Abandono Kiwify recebe e-mail na hora pelo webhook; aqui é o resto:
//   Pix/boleto/recusada/Stripe expirado — e qualquer abandono que falhou.)
//
// Passada B — CONTAS GRÁTIS SEM COMPRA:
//   users plan='free' criados entre 24h e 90d atrás, ainda não processados
//   (users.remarketing_sent_at IS NULL). Cap de 80/run pra não estourar o
//   estoque antigo num dia só. Quem já comprou/optou-out é marcado como
//   processado sem receber nada. 1 e-mail por pessoa, pra sempre.
//
// LGPD: TODO envio checa email_optouts; o e-mail leva link de descadastro.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo, logWarn } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";
import { buildAbandonedEmail, buildFreeUserEmail } from "@/lib/remarketing-email";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function checkAuth(req: Request): Promise<{ ok: true; source: "cron" | "admin-secret" | "admin-session" } | { ok: false; reason: string }> {
  const cronSecret = process.env.CRON_SECRET || "";
  const authHeader = req.headers.get("authorization") || "";
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { ok: true, source: "cron" };
  }

  const adminSecret = process.env.ADMIN_SECRET || "";
  const adminHeader = req.headers.get("x-admin-secret") || "";
  if (adminSecret && adminHeader === adminSecret) {
    return { ok: true, source: "admin-secret" };
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const email = (user?.email || "").toLowerCase();
    if (user && ADMIN_EMAILS.includes(email)) {
      return { ok: true, source: "admin-session" };
    }
  } catch {}

  return { ok: false, reason: "missing or invalid auth" };
}

async function processRemarketing(req: Request): Promise<NextResponse> {
  const admin = createAdminClient();
  const siteUrl = getSiteUrl(req);
  const nowIso = new Date().toISOString();

  let leadsSent = 0;
  let leadsConverted = 0;
  let freeSent = 0;
  let skipped = 0;
  const errors: string[] = [];

  // ─── Passada A: leads de checkout não concluído ─────────────────────────────
  try {
    const leadMin = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const leadMax = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { data: leads, error: leadsErr } = await admin
      .from("leads")
      .select("id, email, name, source, product_label, checkout_url, locale, created_at")
      .is("remarketing_sent_at", null)
      .is("converted_at", null)
      .gte("created_at", leadMin)
      .lte("created_at", leadMax)
      .limit(100);
    if (leadsErr) throw new Error(leadsErr.message);

    if (leads && leads.length > 0) {
      const emails = Array.from(new Set(leads.map((l) => l.email)));

      // Batch: optouts e compras dos últimos 8d desses e-mails (2 queries).
      const [{ data: optoutRows }, { data: purchaseRows }] = await Promise.all([
        admin.from("email_optouts").select("email").in("email", emails),
        admin
          .from("purchases")
          .select("email, created_at")
          .in("email", emails)
          .gte("created_at", new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()),
      ]);
      const optedOut = new Set((optoutRows ?? []).map((r) => r.email));
      const lastPurchaseByEmail = new Map<string, string>();
      for (const p of purchaseRows ?? []) {
        const prev = lastPurchaseByEmail.get(p.email);
        if (!prev || p.created_at > prev) lastPurchaseByEmail.set(p.email, p.created_at);
      }

      for (const lead of leads) {
        try {
          // Comprou depois do lead? Converteu — não cutuca.
          const lastBuy = lastPurchaseByEmail.get(lead.email);
          if (lastBuy && lastBuy >= lead.created_at) {
            await admin.from("leads").update({ converted_at: nowIso }).eq("id", lead.id);
            leadsConverted++;
            continue;
          }
          if (optedOut.has(lead.email)) {
            // Marca como processado pra não re-escanear (LGPD: nunca envia).
            await admin.from("leads").update({ remarketing_sent_at: nowIso }).eq("id", lead.id);
            skipped++;
            continue;
          }

          const { subject, html } = buildAbandonedEmail({
            locale: lead.locale,
            email: lead.email,
            name: lead.name,
            productLabel: lead.product_label,
            checkoutUrl: lead.checkout_url,
            siteUrl,
          });
          const result = await sendCustomerEmailWithLog({
            scope: "cron.remarketing.lead",
            to: lead.email,
            subject,
            html,
            refId: lead.id,
          });
          if (result.ok) {
            await admin.from("leads").update({ remarketing_sent_at: nowIso }).eq("id", lead.id);
            leadsSent++;
          } else {
            errors.push(`lead ${lead.email}: ${result.reason || "send failed"}`);
          }
        } catch (e) {
          errors.push(`lead ${lead.email}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } catch (e) {
    // Tabela leads pode não existir antes da migration — passada A vira no-op.
    logWarn("cron.remarketing", "leads pass failed", { error: String(e) });
    errors.push(`leads pass: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ─── Passada B: contas grátis que nunca compraram ───────────────────────────
  try {
    const userMin = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const userMax = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: freeUsers, error: usersErr } = await admin
      .from("users")
      .select("id, email, name, locale, created_at")
      .eq("plan", "free")
      .is("remarketing_sent_at", null)
      .gte("created_at", userMin)
      .lte("created_at", userMax)
      .order("created_at", { ascending: false })
      .limit(80);
    if (usersErr) throw new Error(usersErr.message);

    if (freeUsers && freeUsers.length > 0) {
      const emails = freeUsers.map((u) => (u.email || "").toLowerCase()).filter(Boolean);
      const [{ data: optoutRows }, { data: buyerRows }] = await Promise.all([
        admin.from("email_optouts").select("email").in("email", emails),
        admin.from("purchases").select("email").in("email", emails),
      ]);
      const optedOut = new Set((optoutRows ?? []).map((r) => r.email));
      const buyers = new Set((buyerRows ?? []).map((r) => r.email));

      for (const u of freeUsers) {
        const emailLc = (u.email || "").toLowerCase();
        try {
          // Admin, comprador ou optout → marca processado SEM enviar.
          if (!emailLc || ADMIN_EMAILS.includes(emailLc) || buyers.has(emailLc) || optedOut.has(emailLc)) {
            await admin.from("users").update({ remarketing_sent_at: nowIso }).eq("id", u.id);
            skipped++;
            continue;
          }

          const { subject, html } = buildFreeUserEmail({
            locale: u.locale,
            email: emailLc,
            name: u.name,
            siteUrl,
          });
          const result = await sendCustomerEmailWithLog({
            scope: "cron.remarketing.free",
            to: emailLc,
            subject,
            html,
            refId: u.id,
          });
          if (result.ok) {
            await admin.from("users").update({ remarketing_sent_at: nowIso }).eq("id", u.id);
            freeSent++;
          } else {
            errors.push(`free ${emailLc}: ${result.reason || "send failed"}`);
          }
        } catch (e) {
          errors.push(`free ${emailLc}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } catch (e) {
    // Coluna remarketing_sent_at pode não existir antes da migration — no-op.
    logWarn("cron.remarketing", "free users pass failed", { error: String(e) });
    errors.push(`free pass: ${e instanceof Error ? e.message : String(e)}`);
  }

  logInfo("cron.remarketing", "batch complete", { leadsSent, leadsConverted, freeSent, skipped, errors: errors.length });

  return NextResponse.json({
    ok: true,
    leadsSent,
    leadsConverted,
    freeSent,
    skipped,
    errors: errors.length,
    errorSamples: errors.slice(0, 5),
  });
}

export async function POST(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  logInfo("cron.remarketing", "triggered", { source: auth.source });
  return processRemarketing(req);
}

// Vercel Cron usa GET por padrão
export async function GET(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  logInfo("cron.remarketing", "triggered", { source: auth.source });
  return processRemarketing(req);
}
