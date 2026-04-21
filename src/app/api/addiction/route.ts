import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATB_SYSTEM_PROMPT, deepseekComplete } from "@/lib/deepseek";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("plan").eq("id", user.id).maybeSingle();
    const plan: Plan = (profile?.plan as Plan) || "free";
    if (plan !== "premium") return NextResponse.json({ error: "upgrade" }, { status: 403 });

    const { category } = await req.json();
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "categoria inválida" }, { status: 400 });
    }

    const raw = await deepseekComplete([
      { role: "system", content: ATB_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Mapeie o padrão "${category}" para um arquétipo do tarot e gere orientação espiritual personalizada para romper esse ciclo. Responda APENAS em JSON válido, sem markdown, no formato exato: {"card":"Nome da Carta","meaning":"significado da carta aplicado a este padrão (3-4 frases)","steps":["passo espiritual 1","passo espiritual 2","passo espiritual 3"]}`,
      },
    ]);

    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        card: "A Torre",
        meaning: raw,
        steps: ["Observe o padrão com compaixão.", "Crie um ritual diário de presença.", "Busque apoio quando necessário."],
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "erro" }, { status: 500 });
  }
}
