import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateEmail, rateLimit, getClientIp } from "@/lib/security";
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

      // Se tem compra (subscriptions OU one-shots), liga ao user.
      // Prioriza assinaturas (basic/premium) para definir users.plan.
      // One-shots (limpeza, limpeza_v2, espirito) são linkadas via purchases.user_id
      // mas não alteram users.plan — quem controla acesso a esses produtos
      // é a presença de purchase, não plan.
      const { data: subscription } = await adminClient
        .from("purchases")
        .select("plan, kiwify_order_id")
        .eq("email", normalizedEmail)
        .in("plan", ["basic", "premium"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscription?.plan) {
        await adminClient
          .from("users")
          .update({
            plan: subscription.plan,
            kiwify_order_id: subscription.kiwify_order_id,
          })
          .eq("id", data.user.id);
      }

      // Credita "perguntas avulsas" compradas ANTES do signup (funil de entrada):
      // soma todos os credits de purchases pergunta1/3/7 desse email.
      const { data: perguntaPurchases } = await adminClient
        .from("purchases")
        .select("plan")
        .eq("email", normalizedEmail)
        .in("plan", ["pergunta1", "pergunta3", "pergunta7"]);

      if (perguntaPurchases && perguntaPurchases.length > 0) {
        let credits = 0;
        for (const p of perguntaPurchases) {
          if (p.plan === "pergunta1") credits += 1;
          else if (p.plan === "pergunta3") credits += 3;
          else if (p.plan === "pergunta7") credits += 7;
        }
        if (credits > 0) {
          const { error: creditErr } = await adminClient
            .from("users")
            .update({
              chat_credits_balance: credits,
              chat_credits_total_purchased: credits,
            })
            .eq("id", data.user.id);
          if (creditErr) {
            logWarn("signup", "reconciliation failed", {
              email: normalizedEmail,
              credits,
              error: creditErr.message,
            });
          } else {
            logInfo("signup", "reconciled pergunta credits", {
              email: normalizedEmail,
              credits,
              purchases_count: perguntaPurchases.length,
            });
          }
        }
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
