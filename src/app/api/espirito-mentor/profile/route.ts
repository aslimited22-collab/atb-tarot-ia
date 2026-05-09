import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeInput, rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

const VALID_LOST = new Set([
  "mae", "pai", "marido_esposa", "filho", "irmao", "avo", "amigo", "outro", "ninguem",
]);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`espirito-profile:${ip}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Confirma compra de Espírito
    const userEmail = (user.email || "").toLowerCase();
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("email", userEmail)
      .eq("plan", "espirito")
      .neq("event", "order.refunded")
      .neq("event", "order_refunded")
      .limit(1)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json({ error: "Você precisa adquirir a Sessão Espírita." }, { status: 402 });
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8_000) {
      return NextResponse.json({ error: "Dados muito longos." }, { status: 413 });
    }

    const body = await req.json().catch(() => ({}));

    // Nome
    const nameSanity = sanitizeInput(String(body?.full_name || ""), 60);
    if (!nameSanity.ok || nameSanity.value.length < 2) {
      return NextResponse.json({ error: "Por favor preencha seu nome." }, { status: 400 });
    }
    const fullName = nameSanity.value;

    // Idade
    const ageNum = Number(body?.age);
    if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 120) {
      return NextResponse.json({ error: "Idade inválida." }, { status: 400 });
    }

    // Quem perdeu (whitelist)
    const lostLovedOne = String(body?.lost_loved_one || "");
    if (!VALID_LOST.has(lostLovedOne)) {
      return NextResponse.json({ error: "Selecione quem você perdeu." }, { status: 400 });
    }

    // Nome da pessoa do outro lado (texto livre, opcional se ninguem)
    const whoSanity = sanitizeInput(String(body?.who_to_talk || ""), 80);
    if (lostLovedOne !== "ninguem" && (!whoSanity.ok || whoSanity.value.length < 2)) {
      return NextResponse.json({ error: "Por favor escreva o nome de quem você quer alcançar." }, { status: 400 });
    }
    const whoToTalk = whoSanity.ok ? whoSanity.value : "";

    // Pergunta principal (texto livre)
    const questionSanity = sanitizeInput(String(body?.main_question || ""), 500);
    if (!questionSanity.ok || questionSanity.value.length < 10) {
      return NextResponse.json({ error: "Conte sua pergunta para o outro lado (mínimo 10 caracteres)." }, { status: 400 });
    }
    const mainQuestion = questionSanity.value;

    const { error: upsertErr } = await supabase
      .from("espirito_profile")
      .upsert(
        {
          user_id: user.id,
          full_name: fullName,
          age: ageNum,
          lost_loved_one: lostLovedOne,
          who_to_talk: whoToTalk,
          main_question: mainQuestion,
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
