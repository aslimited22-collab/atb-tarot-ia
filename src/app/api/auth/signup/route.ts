import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

  let body: { email?: string; password?: string; name?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }

  const { email = "", password = "", name = "" } = body;

  // Valida email
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: emailCheck.reason }, { status: 400 });
  }

  // Valida senha
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres." }, { status: 400 });
  }

  // Valida nome
  const cleanName = name.trim().slice(0, 60);
  if (!cleanName) {
    return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email: email.toLowerCase().trim(), password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user?.id && cleanName) {
    await supabase.from("users").update({ name: cleanName }).eq("id", data.user.id);
  }

  return NextResponse.json({ ok: true });
}
