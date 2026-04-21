import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATB_SYSTEM_PROMPT, deepseekComplete } from "@/lib/deepseek";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("oracle_readings")
      .select("card_name, reading_text")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      const parts = existing.reading_text.split("\n---\n");
      return NextResponse.json({
        card: existing.card_name,
        interpretation: parts[0] || existing.reading_text,
        message: parts[1] || "",
      });
    }

    const raw = await deepseekComplete([
      { role: "system", content: ATB_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          'Sorteie uma carta do tarot para meu dia de hoje e me dê uma leitura personalizada. Responda apenas em JSON válido com este formato exato, sem markdown: {"card":"Nome da Carta","interpretation":"interpretação completa da carta no contexto do meu dia (3-5 frases)","message":"mensagem curta e inspiradora do dia (1-2 frases)"}',
      },
    ]);

    let parsed: { card: string; interpretation: string; message: string };
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { card: "O Mago", interpretation: raw, message: "Confie no seu poder de criação." };
    }

    await supabase.from("oracle_readings").insert({
      user_id: user.id,
      card_name: parsed.card,
      reading_text: `${parsed.interpretation}\n---\n${parsed.message}`,
      date: today,
    });

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "erro" }, { status: 500 });
  }
}
