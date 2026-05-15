// /api/user/me
// GET    — exporta TODOS os dados do usuário (LGPD Art. 18 — direito de portabilidade)
// DELETE — exclui conta + anonimiza registros fiscais (LGPD Art. 18 — direito ao esquecimento)
//
// Auth: usuário precisa estar logado (sessão Supabase via cookie).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logInfo, logWarn, logError } from "@/lib/logger";
import { getClientIp } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -------------------------------------------------------------
// GET — exporta dados do usuário em JSON
// -------------------------------------------------------------
export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const email = (user.email || "").toLowerCase();
  const userId = user.id;

  // Coleta paralela de todas as tabelas com dados do usuário
  const [
    usersRow,
    chatMessages,
    oracleReadings,
    journalEntries,
    limpezaMessages,
    limpezaProfile,
    espiritoMessages,
    espiritoProfile,
    orders,
    purchases,
  ] = await Promise.all([
    admin.from("users").select("*").eq("id", userId).maybeSingle(),
    admin.from("chat_messages").select("*").eq("user_id", userId),
    admin.from("oracle_readings").select("*").eq("user_id", userId),
    admin.from("journal_entries").select("*").eq("user_id", userId),
    admin.from("limpeza_messages").select("*").eq("user_id", userId),
    admin.from("limpeza_profile").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("espirito_messages").select("*").eq("user_id", userId),
    admin.from("espirito_profile").select("*").eq("user_id", userId).maybeSingle(),
    admin.from("orders").select("*").eq("email", email),
    admin.from("purchases").select("*").eq("email", email),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user: {
      id: userId,
      email,
      created_at: user.created_at,
      profile: usersRow.data || null,
    },
    chat_messages: chatMessages.data || [],
    oracle_readings: oracleReadings.data || [],
    journal_entries: journalEntries.data || [],
    limpeza_messages: limpezaMessages.data || [],
    limpeza_profile: limpezaProfile.data || null,
    espirito_messages: espiritoMessages.data || [],
    espirito_profile: espiritoProfile.data || null,
    orders: orders.data || [],
    purchases: purchases.data || [],
  };

  // Audit log
  await admin.from("audit_log").insert({
    user_id: userId,
    event: "user.data_exported",
    ip: getClientIp(req),
    user_agent: req.headers.get("user-agent")?.slice(0, 200) || null,
    metadata: { tables: Object.keys(exportData).length },
  });

  logInfo("user.export", "data exported", { userId });

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="atb-meus-dados-${Date.now()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

// -------------------------------------------------------------
// DELETE — exclui conta do usuário (LGPD direito ao esquecimento)
// -------------------------------------------------------------
export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const email = (user.email || "").toLowerCase();
  const userId = user.id;

  // Body opcional: confirmação textual
  let body: { confirmation?: string } = {};
  try {
    body = await req.json();
  } catch {
    // sem body é OK
  }

  if (body.confirmation !== "EXCLUIR" && body.confirmation !== "DELETE") {
    return NextResponse.json(
      { error: "confirmation required: send {\"confirmation\":\"EXCLUIR\"}" },
      { status: 400 }
    );
  }

  try {
    // 1. Audit log ANTES de deletar (depois o user_id some)
    await admin.from("audit_log").insert({
      user_id: userId,
      event: "user.account_deleted",
      ip: getClientIp(req),
      user_agent: req.headers.get("user-agent")?.slice(0, 200) || null,
      metadata: { email_hash: hashEmail(email) },
    });

    // 2. Anonimiza purchases/orders (retenção fiscal exige guardar, mas removemos PII)
    const { error: anonErr } = await admin.rpc("anonymize_user_records", { target_email: email });
    if (anonErr) {
      logWarn("user.delete", "anonymize failed (continuando mesmo assim)", { userId, error: anonErr.message });
    }

    // 3. Deleta o usuário do Supabase Auth — CASCADE FK (migration 0010) limpa public.users
    //    e as tabelas filhas com ON DELETE CASCADE
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      logError("user.delete", "auth delete failed", { userId, error: delErr.message });
      return NextResponse.json({ error: "failed to delete account" }, { status: 500 });
    }

    logInfo("user.delete", "account deleted", { userId });

    return NextResponse.json({ ok: true, message: "Account deleted. Goodbye 💛" }, { status: 200 });
  } catch (e: unknown) {
    logError("user.delete", "unexpected error", { userId, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// Hash determinístico simples só pra audit log saber se o mesmo e-mail tentou de novo
// (não usado em segurança — só rastreamento)
function hashEmail(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) {
    h = ((h << 5) - h) + email.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}
