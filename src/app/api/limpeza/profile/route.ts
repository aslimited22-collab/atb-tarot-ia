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

    // Campos OPCIONAIS — modo "Começar agora" salva só o nome; a ATB pergunta o
    // resto na conversa. Quando vierem, valida; senão ignora (não bloqueia).
    let ageNum: number | null = null;
    if (body?.age !== undefined && body?.age !== null && String(body.age).trim() !== "") {
      const n = Number(body.age);
      if (!Number.isFinite(n) || n < 13 || n > 120) {
        return NextResponse.json({ error: "Idade inválida." }, { status: 400 });
      }
      ageNum = n;
    }
    const maritalStatus = VALID_MARITAL.has(String(body?.marital_status || "")) ? String(body?.marital_status) : null;
    const mainFeeling = VALID_FEELINGS.has(String(body?.main_feeling || "")) ? String(body?.main_feeling) : null;
    let situation: string | null = null;
    if (body?.situation) {
      const s = sanitizeInput(String(body.situation), 500);
      if (s.ok && s.value.length >= 10) situation = s.value;
    }

    // Upsert mesclando: grava só os campos que vieram (não apaga o que já existe).
    const patch: Record<string, any> = { user_id: user.id, full_name: fullName, updated_at: new Date().toISOString() };
    if (ageNum !== null) patch.age = ageNum;
    if (maritalStatus !== null) patch.marital_status = maritalStatus;
    if (mainFeeling !== null) patch.main_feeling = mainFeeling;
    if (situation !== null) patch.situation = situation;
    const { error: upsertErr } = await supabase
      .from("limpeza_profile")
      .upsert(patch, { onConflict: "user_id" });

    if (upsertErr) {
      return NextResponse.json({ error: "Erro ao salvar dados." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
