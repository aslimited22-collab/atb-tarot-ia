// POST/GET /api/cron/follow-up
//
// Endpoint serve 2 fontes:
//   1. Vercel Cron (diário 18h BRT) → header `Authorization: Bearer ${CRON_SECRET}`
//   2. Admin manual via /admin/insights → header `X-Admin-Secret: ${ADMIN_SECRET}`
//
// Lógica:
//   Busca purchases dos últimos 7d com follow_up_sent_at = null E criadas há > 24h.
//   Pra cada uma checa se cliente acessou o produto. Se NÃO, envia email de
//   resgate e marca follow_up_sent_at = now() pra não disparar de novo.
//
// Idempotente: pode rodar várias vezes sem duplicar.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";
import { buildRecoveryEmail, productFromPlan } from "@/lib/recovery-email";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SALE_EVENTS = [
  "order.approved", "order_approved",
  "pergunta1_purchased", "pergunta3_purchased", "pergunta7_purchased",
  "pergunta1_purchased_intl", "pergunta3_purchased_intl", "pergunta7_purchased_intl",
  "limpeza_purchased", "limpeza_v2_purchased", "limpeza_v2_purchased_intl",
  "espirito_purchased", "video_call_purchased",
  "basic_purchased_intl", "premium_purchased_intl",
];

async function checkAuth(req: Request): Promise<{ ok: true; source: "cron" | "admin-secret" | "admin-session" } | { ok: false; reason: string }> {
  // 1. Vercel Cron bearer
  const cronSecret = process.env.CRON_SECRET || "";
  const authHeader = req.headers.get("authorization") || "";
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { ok: true, source: "cron" };
  }

  // 2. Admin secret header (curl/scripts)
  const adminSecret = process.env.ADMIN_SECRET || "";
  const adminHeader = req.headers.get("x-admin-secret") || "";
  if (adminSecret && adminHeader === adminSecret) {
    return { ok: true, source: "admin-secret" };
  }

  // 3. Supabase admin session (botão no /admin/insights)
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

async function userAccessedProduct(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<boolean> {
  // Checa se user tem atividade em qualquer chat
  const [{ count: chat }, { count: limpeza }, { count: espirito }] = await Promise.all([
    admin.from("chat_messages").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("limpeza_messages").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("espirito_messages").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return (chat ?? 0) > 0 || (limpeza ?? 0) > 0 || (espirito ?? 0) > 0;
}

async function processFollowUps(req: Request): Promise<NextResponse> {
  const admin = createAdminClient();
  const siteUrl = getSiteUrl(req);

  // Janela: purchases criadas entre 24h e 7d atrás, sem follow-up enviado
  const min = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const max = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const { data: pending, error } = await admin
    .from("purchases")
    .select("id, email, name, plan, created_at, user_id")
    .in("event", SALE_EVENTS)
    .gte("created_at", min)
    .lte("created_at", max)
    .is("follow_up_sent_at", null)
    .limit(100);

  if (error) {
    logError("cron.follow-up", "query failed", { error: error.message });
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "no pending follow-ups" });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const p of pending) {
    try {
      const productType = productFromPlan(p.plan);
      if (!productType) {
        skipped++;
        continue;
      }

      // Check se cliente já acessou produto. Se sim, pula (não precisa de resgate).
      if (p.user_id) {
        const accessed = await userAccessedProduct(admin, p.user_id);
        if (accessed) {
          // Marca como "follow-up resolvido" pra não checar de novo
          await admin
            .from("purchases")
            .update({ follow_up_sent_at: new Date().toISOString() })
            .eq("id", p.id);
          skipped++;
          continue;
        }
      } else {
        // Sem user_id: tenta encontrar por email (pode ter criado conta depois)
        const { data: maybeUser } = await admin
          .from("users")
          .select("id")
          .eq("email", p.email.toLowerCase())
          .maybeSingle();
        if (maybeUser?.id) {
          const accessed = await userAccessedProduct(admin, maybeUser.id);
          if (accessed) {
            await admin
              .from("purchases")
              .update({ follow_up_sent_at: new Date().toISOString(), user_id: maybeUser.id })
              .eq("id", p.id);
            skipped++;
            continue;
          }
        }
      }

      // Cliente NÃO acessou — envia email de resgate
      const { subject, html } = buildRecoveryEmail({
        product: productType,
        email: p.email,
        name: p.name,
        siteUrl,
      });

      const result = await sendCustomerEmailWithLog({
        scope: "cron.follow-up",
        to: p.email,
        subject,
        html,
        refId: p.id,
      });

      if (result.ok) {
        await admin
          .from("purchases")
          .update({ follow_up_sent_at: new Date().toISOString() })
          .eq("id", p.id);
        sent++;
      } else {
        errors.push(`${p.email}: ${result.reason || "send failed"}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${p.email}: ${msg}`);
      logWarn("cron.follow-up", "per-row error", { purchaseId: p.id, error: msg });
    }
  }

  logInfo("cron.follow-up", "batch complete", { sent, skipped, errors: errors.length, total: pending.length });

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    errors: errors.length,
    total: pending.length,
    errorSamples: errors.slice(0, 5),
  });
}

export async function POST(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return processFollowUps(req);
}

// Vercel Cron usa GET por padrão
export async function GET(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return processFollowUps(req);
}
