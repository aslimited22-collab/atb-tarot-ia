import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATB_SYSTEM_PROMPT, deepseekComplete } from "@/lib/deepseek";

export const runtime = "nodejs";

// Fallback espírita (não-tarot) usado quando a IA devolve JSON inválido.
const FALLBACK = {
  card: "A Pomba Branca",
  interpretation:
    "Hoje os guias mostram leveza chegando aos poucos. Você passou por dias de muito peso e agora está sendo guiada com mais cuidado. Confie no que sente — não é coincidência, é mensagem.",
  message: "Há luz suficiente para iluminar seus próximos passos.",
};

function readingFromRow(row: { card_name: string; reading_text: string }) {
  const parts = row.reading_text.split("\n---\n");
  return {
    card: row.card_name,
    interpretation: parts[0] || row.reading_text,
    message: parts[1] || "",
  };
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("plan").eq("id", user.id).maybeSingle();
    if ((profile?.plan || "free") === "free") {
      return NextResponse.json({ error: "Oráculo disponível apenas para assinantes. Faça upgrade." }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Cache: já existe leitura de hoje?
    const { data: existing } = await supabase
      .from("oracle_readings")
      .select("card_name, reading_text")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(readingFromRow(existing));
    }

    // Gera nova mensagem espírita (não-tarot).
    const raw = await deepseekComplete([
      { role: "system", content: ATB_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          'Traga uma mensagem espírita simbólica para meu dia de hoje e me dê uma reflexão personalizada. Responda apenas em JSON válido com este formato exato, sem markdown: {"card":"Nome simbólico da mensagem (ex: A Pomba, A Vela Acesa, O Lírio Branco — NUNCA use nomes de cartas de tarot)","interpretation":"reflexão completa no contexto do meu dia (3-5 frases)","message":"mensagem curta e inspiradora do dia (1-2 frases)"}',
      },
    ]);

    let parsed: { card: string; interpretation: string; message: string };
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
      if (!parsed?.card || !parsed?.interpretation) throw new Error("missing fields");
    } catch {
      parsed = { ...FALLBACK };
    }

    // INSERT com tratamento de race condition.
    // UNIQUE INDEX em (user_id, date) garante que só uma das requests paralelas
    // grava — a outra cai no 23505 e relê o que ficou no banco.
    const { error: insErr } = await supabase.from("oracle_readings").insert({
      user_id: user.id,
      card_name: parsed.card,
      reading_text: `${parsed.interpretation}\n---\n${parsed.message}`,
      date: today,
    });

    if (insErr) {
      const isUnique = (insErr as { code?: string }).code === "23505";
      if (isUnique) {
        // Outra request paralela ganhou — devolve a versão dela
        const { data: race } = await supabase
          .from("oracle_readings")
          .select("card_name, reading_text")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();
        if (race) return NextResponse.json(readingFromRow(race));
      }
      // Outro erro: responde a versão que geramos (sem persistir)
      return NextResponse.json(parsed);
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
