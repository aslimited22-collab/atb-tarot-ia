import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateEmail, rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Máximo 5 cadastros por IP por hora
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
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

      // Se tem compra de plano basic/premium, atualiza o plano
      const { data: existingPurchase } = await adminClient
        .from("purchases")
        .select("plan, kiwify_order_id")
        .eq("email", normalizedEmail)
        .in("plan", ["basic", "premium"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPurchase?.plan) {
        await adminClient
          .from("users")
          .update({
            plan: existingPurchase.plan,
            kiwify_order_id: existingPurchase.kiwify_order_id,
          })
          .eq("id", data.user.id);
      }
    } catch {
      // Falha silenciosa — não quebra signup
    }
  }

  return NextResponse.json({ ok: true });
}
