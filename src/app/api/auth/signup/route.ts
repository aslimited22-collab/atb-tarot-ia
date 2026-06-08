import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateEmail, rateLimit, getClientIp } from "@/lib/security";
import { reconcileChatCredits } from "@/lib/reconcileCredits";
import { reconcileUserPlan } from "@/lib/reconcilePlan";
import { logInfo, logWarn } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Máximo 5 cadastros por IP por hora
  const rl = await rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // Limita corpo
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4_000) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 413 });
  }

  let body: { email?: string; password?: string; name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }

  const { email = "", password = "", name = "" } = body;

  // Valida email
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: emailCheck.reason }, { status: 400 });
  }

  // Valida senha — mínimo 8 caracteres (NIST recomendação)
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Senha deve ter no mínimo 8 caracteres." }, { status: 400 });
  }

  // Bloqueia senhas óbvias muito comuns
  const lowerPwd = password.toLowerCase();
  const trivialPasswords = ["12345678", "password", "senha123", "11111111", "00000000", "abcdefgh", "qwertyui"];
  if (trivialPasswords.includes(lowerPwd)) {
    return NextResponse.json({ error: "Esta senha é muito comum. Escolha uma mais segura." }, { status: 400 });
  }

  // Valida nome
  const cleanName = name.trim().slice(0, 60);
  if (!cleanName || cleanName.length < 2) {
    return NextResponse.json({ error: "Nome obrigatório (mínimo 2 caracteres)." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });

  if (error) {
    // Mensagem genérica para evitar user enumeration
    // Apenas erros operacionais (ex: senha fraca via Supabase) podem aparecer
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      // Sucesso aparente — não revela se email existe
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Não foi possível criar a conta. Verifique os dados." }, { status: 400 });
  }

  if (data.user?.id) {
    // Atualiza nome
    if (cleanName) {
      await supabase.from("users").update({ name: cleanName }).eq("id", data.user.id);
    }

    // Linka compras órfãs (cliente comprou ANTES de criar conta) pelo email
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("purchases")
        .update({ user_id: data.user.id })
        .eq("email", normalizedEmail)
        .is("user_id", null);

      // Define users.plan a partir das compras (basic/premium). Usa o helper
      // compartilhado — cancel-aware e só-upgrade — o MESMO usado no dashboard e
      // /api/chat, garantindo cura consistente em qualquer ponto de entrada.
      // One-shots (limpeza, espirito, etc.) não alteram users.plan; o acesso a
      // esses produtos é controlado pela presença da purchase, não pelo plano.
      await reconcileUserPlan(adminClient, data.user.id, normalizedEmail);

      // Credita "perguntas avulsas" compradas ANTES do signup (funil de entrada).
      // Helper centralizado (idempotente) — mesma função é chamada em /api/chat
      // e /dashboard pra cobrir race com webhook atrasado.
      const recon = await reconcileChatCredits(adminClient, data.user.id, normalizedEmail);
      if (recon.creditedNow > 0) {
        logInfo("signup", "reconciled pergunta credits", {
          email: normalizedEmail,
          credited: recon.creditedNow,
          totalPurchased: recon.totalPurchased,
        });
      }
    } catch (e) {
      // Falha silenciosa — não quebra signup, mas registra
      logWarn("signup", "reconciliation exception", {
        email: normalizedEmail,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
