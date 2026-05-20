// POST /api/numerology/profile
// Salva nome completo + data de nascimento do usuário pra calcular mapa numerológico.
// Apenas usuários autenticados (premium gating na página, não no endpoint).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, sanitizeInput } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const year = d.getUTCFullYear();
  if (year < 1900 || year > new Date().getUTCFullYear()) return false;
  return true;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`numerology-profile:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um momento." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { full_name?: string; birth_date?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }

  const nameSanity = sanitizeInput(String(body.full_name || ""), 100);
  if (!nameSanity.ok || nameSanity.value.length < 2) {
    return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
  }
  const fullName = nameSanity.value;

  const birthDate = String(body.birth_date || "").trim();
  if (!isValidDate(birthDate)) {
    return NextResponse.json({ error: "Data de nascimento inválida." }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName, birth_date: birthDate })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Erro ao salvar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
