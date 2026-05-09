import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeInput, rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

// Whitelists para validar valores enviados pelo client
const VALID_MARITAL = new Set(["solteira", "casada", "divorciada", "viuva", "uniao_estavel", "outro"]);
const VALID_FEELINGS = new Set([
  "tristeza_profunda",
  "ansiedade",
  "raiva",
  "medo",
  "vazio",
  "inveja_alheia",
  "energia_pesada",
  "amor_bloqueado",
  "outro",
]);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`limpeza-profile:${ip}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Confirma que tem compra de limpeza
    const userEmail = (user.email || "").toLowerCase();
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("email", userEmail)
      .eq("plan", "limpeza")
      .neq("event", "order.refunded")
      .neq("event", "order_refunded")
      .limit(1)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json({ error: "Você precisa adquirir a Limpeza." }, { status: 402 });
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8_000) {
      return NextResponse.json({ error: "Dados muito longos." }, { status: 413 });
    }

    const body = await req.json().catch(() => ({}));

    // Valida nome (max 60)
    const nameSanity = sanitizeInput(String(body?.full_name || ""), 60);
    if (!nameSanity.ok || nameSanity.value.length < 2) {
      return NextResponse.json({ error: "Por favor preencha seu nome." }, { status: 400 });
    }
    const fullName = nameSanity.value;

    // Valida idade
    const ageNum = Number(body?.age);
    if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 120) {
      return NextResponse.json({ error: "Idade inválida." }, { status: 400 });
    }

    // Valida estado civil
    const maritalStatus = String(body?.marital_status || "");
    if (!VALID_MARITAL.has(maritalStatus)) {
      return NextResponse.json({ error: "Estado civil inválido." }, { status: 400 });
    }

    // Valida sentimento principal
    const mainFeeling = String(body?.main_feeling || "");
    if (!VALID_FEELINGS.has(mainFeeling)) {
      return NextResponse.json({ error: "Sentimento inválido." }, { status: 400 });
    }

    // Valida situação (texto livre, max 500)
    const situationSanity = sanitizeInput(String(body?.situation || ""), 500);
    if (!situationSanity.ok || situationSanity.value.length < 10) {
      return NextResponse.json({ error: "Conte um pouco mais sobre sua situação (mínimo 10 caracteres)." }, { status: 400 });
    }
    const situation = situationSanity.value;

    // Upsert: cria ou atualiza
    const { error: upsertErr } = await supabase
      .from("limpeza_profile")
      .upsert(
        {
          user_id: user.id,
          full_name: fullName,
          age: ageNum,
          marital_status: maritalStatus,
          main_feeling: mainFeeling,
          situation: situation,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      return NextResponse.json({ error: "Erro ao salvar dados." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
