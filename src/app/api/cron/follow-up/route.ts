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
import { magicLinkFromGenerate } from "@/lib/magic-entry";
import { sendCustomerEmailWithLog } from "@/lib/delivery";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";
import { buildRecoveryEmail, productFromPlan } from "@/lib/recovery-email";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

// Re-nudge: o magic-link do Supabase EXPIRA. Antes o resgate mandava 1 e-mail só
// e marcava follow_up_sent_at pra sempre — se o link vencesse e o cliente não
// clicasse, ele ficava preso (o anti-spam impedia reenvio). Agora: re-envia um
// link NOVO a cada RENUDGE_DAYS pra quem pagou e ainda não acessou, até
// MAX_TOUCHES no total (não importunar pra sempre).
const RENUDGE_DAYS = 4;
const MAX_TOUCHES = 3;

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

type RecoveryProduct = "pergunta" | "limpeza" | "subscription" | "espirito" | "videochamada";

async function userAccessedProduct(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  product: RecoveryProduct
): Promise<boolean> {
  // Acesso é PRODUTO-ESPECÍFICO. Um comprador de Limpeza que apenas mexeu no
  // chat grátis NÃO acessou a Limpeza — logo PRECISA receber o resgate. Antes
  // esta função checava QUALQUER atividade (chat/limpeza/espirito juntos), o
  // que fazia o cron PULAR compradores de limpeza/espirito que só usaram o chat
  // geral: eles pagaram, nunca abriram o produto, mas não recebiam o email.
  const countOf = async (table: string): Promise<number> => {
    const { count } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    return count ?? 0;
  };
  if (product === "limpeza") return (await countOf("limpeza_messages")) > 0;
  if (product === "espirito") return (await countOf("espirito_messages")) > 0;
  // pergunta e Consulta Completa (subscription) são entregues no chat geral
  if (product === "pergunta" || product === "subscription") return (await countOf("chat_messages")) > 0;
  // videochamada não tem tabela de mensagens — usa atividade geral como proxy
  const [chat, limpeza, espirito] = await Promise.all([
    countOf("chat_messages"),
    countOf("limpeza_messages"),
    countOf("espirito_messages"),
  ]);
  return chat > 0 || limpeza > 0 || espirito > 0;
}

async function processFollowUps(req: Request, opts?: { resendPlan?: string; forceEmails?: string[] }): Promise<NextResponse> {
  const admin = createAdminClient();
  const siteUrl = getSiteUrl(req);
  const resendPlan = opts?.resendPlan;
  const forceEmails = opts?.forceEmails;

  // Janela normal: purchases criadas entre 1h e 365d atrás, sem follow-up enviado.
  // 1h dá o webhook processar. Janela larga (365d) garante que NENHUM cliente
  // que pagou e nunca acessou fique pra trás — o filtro `follow_up_sent_at IS
  // NULL` impede re-spam de quem já recebeu resgate. Foi ampliada de 30d→365d
  // ao descobrir que 100% dos compradores de limpeza (alguns >30d) nunca
  // acessaram por causa da fricção de senha (corrigida com magic-link).
  //
  // Modo RESEND (admin: ?resend=<plan>): re-dispara pra um produto específico
  // IGNORANDO follow_up_sent_at. Necessário pra alcançar clientes que foram
  // MARCADOS como resolvidos mas nunca receberam email de fato (ex: comprador
  // de limpeza pulado pelo antigo bug de "acesso genérico"). A duplicação é
  // evitada checando email_outbox por ref_id no loop abaixo.
  const min = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
  const max = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
  // Limiar de re-nudge: quem foi marcado há mais de RENUDGE_DAYS volta pra fila
  // (o link velho já expirou) — desde que ainda não tenha acessado e não tenha
  // estourado MAX_TOUCHES (checado no loop por compra).
  const renudge = new Date(Date.now() - RENUDGE_DAYS * 24 * 3600 * 1000).toISOString();

  const cols = "id, email, name, plan, created_at, user_id";
  const { data: pending, error } =
    forceEmails && forceEmails.length
      ? // Modo FORCE (admin): reenvia link NOVO pra e-mails específicos, ignorando
        // marca/teto/janela. Só não envia se o cliente já acessou (checado no loop).
        await admin
          .from("purchases")
          .select(cols)
          .in("event", SALE_EVENTS)
          .in("email", forceEmails)
          .limit(50)
      : resendPlan
        ? await admin
            .from("purchases")
            .select(cols)
            .in("event", SALE_EVENTS)
            .lte("created_at", max)
            .eq("plan", resendPlan)
            .limit(300)
        : await admin
            .from("purchases")
            .select(cols)
            .in("event", SALE_EVENTS)
            .lte("created_at", max)
            .gte("created_at", min)
            .or(`follow_up_sent_at.is.null,follow_up_sent_at.lt.${renudge}`)
            .limit(100);

  if (error) {
    logError("cron.follow-up", "query failed", { error: error.message });
    return NextResponse.json({ error: "db error", message: error.message, hint: (error as { hint?: string }).hint, details: (error as { details?: string }).details }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    // Debug query alternativa pra ver se há órfãos sem o filtro .in()
    const { data: dbgCount } = await admin
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .is("follow_up_sent_at", null)
      .gte("created_at", min)
      .lte("created_at", max);
    return NextResponse.json({ ok: true, sent: 0, message: "no pending follow-ups", debug: { min, max, withoutEventFilter: dbgCount, saleEventsCount: SALE_EVENTS.length } });
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

      // Teto de toques + janela de re-nudge (NÃO vale no modo force — admin forçou).
      // Conta os e-mails de resgate já enviados a esta compra + o último: pula se
      // já bateu MAX_TOUCHES OU se o último foi há menos de RENUDGE_DAYS (cedo
      // demais). Assim re-envia um link NOVO a cada ~4 dias, até 3 vezes, em vez
      // de mandar 1 só e travar pra sempre (deixando o cliente preso no link expirado).
      if (!forceEmails) {
        const { data: priorRows, count: priorCount } = await admin
          .from("email_outbox")
          .select("created_at", { count: "exact" })
          .eq("ref_id", p.id)
          .eq("scope", "cron.follow-up")
          .order("created_at", { ascending: false })
          .limit(1);
        const touches = priorCount ?? 0;
        const lastMs = priorRows?.[0]?.created_at ? new Date(priorRows[0].created_at).getTime() : 0;
        const tooSoon = lastMs > Date.now() - RENUDGE_DAYS * 24 * 3600 * 1000;
        if (touches >= MAX_TOUCHES || tooSoon) {
          skipped++;
          continue;
        }
      }

      // Check se cliente já acessou produto. Se sim, pula (não precisa de resgate).
      if (p.user_id) {
        const accessed = await userAccessedProduct(admin, p.user_id, productType);
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
          const accessed = await userAccessedProduct(admin, maybeUser.id, productType);
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

      // Idioma do e-mail de resgate. O template só tem PT/EN/ES — então es→es,
      // e QUALQUER não-pt (en/de/it/ja...) cai em INGLÊS, que o estrangeiro
      // entende, em vez de português. Fail-safe: "pt". O locale do user é
      // capturado no login (dashboard) e na compra Stripe (por moeda).
      let userLocale: "pt" | "en" | "es" = "pt";
      try {
        const { data: ul } = await admin
          .from("users")
          .select("locale")
          .eq("email", p.email.toLowerCase())
          .maybeSingle();
        const loc = (ul as { locale?: string } | null)?.locale || "";
        if (loc === "es") userLocale = "es";
        else if (loc && loc !== "pt") userLocale = "en";
      } catch {
        // Coluna locale pode nao existir em deploys antigos; mantém "pt" default
      }

      // Gera magic-link 1-clique pra remover qualquer fricção de senha (60+ esquece).
      // Cada produto leva DIRETO pra sua tela (não pro dashboard genérico).
      let magicLink: string | undefined;
      try {
        const nextPath =
          productType === "pergunta" ? "/dashboard/chat?welcome=pergunta" :
          productType === "limpeza"  ? "/dashboard/limpeza-espiritual" :
          productType === "espirito" ? "/dashboard/espirito-mentor" :
          "/dashboard";
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: p.email.toLowerCase(),
          options: {
            redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        magicLink = magicLinkFromGenerate(linkData, siteUrl, "");
      } catch (e) {
        logWarn("cron.follow-up", "magic-link gen failed", { email: p.email, error: String(e) });
      }

      // Cliente NÃO acessou — envia email de resgate (na lingua do user)
      const { subject, html } = buildRecoveryEmail({
        product: productType,
        email: p.email,
        name: p.name,
        siteUrl,
        locale: userLocale,
        magicLink,
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

  logInfo("cron.follow-up", "batch complete", { mode: forceEmails ? "force" : resendPlan ? `resend:${resendPlan}` : "normal", sent, skipped, errors: errors.length, total: pending.length });

  return NextResponse.json({
    ok: true,
    mode: forceEmails ? "force" : resendPlan ? `resend:${resendPlan}` : "normal",
    sent,
    skipped,
    errors: errors.length,
    total: pending.length,
    errorSamples: errors.slice(0, 5),
  });
}

// Planos válidos pro modo resend (?resend=<plan>). Whitelist evita query
// arbitrária; só re-dispara pra produtos conhecidos.
const RESEND_WHITELIST = new Set([
  "limpeza", "limpeza_v2", "limpeza_v2_intl",
  "espirito", "pergunta1", "pergunta3", "pergunta7",
  "basic", "premium", "video_call", "videochamada",
]);

function parseResendPlan(req: Request): string | undefined {
  try {
    const v = new URL(req.url).searchParams.get("resend");
    if (v && RESEND_WHITELIST.has(v)) return v;
  } catch {}
  return undefined;
}

// Modo FORCE (admin): ?force=email1,email2 — reenvia link NOVO pra esses e-mails
// ignorando marca/teto/janela (mas pula quem já acessou). Pra destravar clientes
// cujo magic-link expirou. Máx 20 por chamada.
function parseForceEmails(req: Request): string[] | undefined {
  try {
    const v = new URL(req.url).searchParams.get("force");
    if (!v) return undefined;
    const list = v.split(",").map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@"));
    return list.length ? list.slice(0, 20) : undefined;
  } catch {}
  return undefined;
}

export async function POST(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return processFollowUps(req, { resendPlan: parseResendPlan(req), forceEmails: parseForceEmails(req) });
}

// Vercel Cron usa GET por padrão
export async function GET(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return processFollowUps(req, { resendPlan: parseResendPlan(req), forceEmails: parseForceEmails(req) });
}
