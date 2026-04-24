import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATB_SYSTEM_PROMPT, deepseekComplete } from "@/lib/deepseek";
import { validateCategory, rateLimit, getClientIp } from "@/lib/security";
import { findAddictionEntry, isAiOnlyCategory } from "@/lib/addiction-data";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 50;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`addiction:${ip}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Aguarde." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("users").select("plan").eq("id", user.id).maybeSingle();
    const plan: Plan = (profile?.plan as Plan) || "free";
    if (plan !== "premium") return NextResponse.json({ error: "upgrade" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const category = String(body?.category || "").trim().slice(0, 50);

    if (!validateCategory(category)) {
      return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
    }

    // Categorias com conteúdo próprio dos PDFs (lookup case-insensitive)
    const entry = findAddictionEntry(category);
    if (entry) {
      return NextResponse.json({
        mode: "rich",
        card: entry.card,
        cardMeaning: entry.cardMeaning,
        forces: entry.forces,
        insight: entry.insight,
        rituals: entry.rituals,
        routine: entry.routine,
        truth: entry.truth,
      });
    }

    // Categorias sem PDF — DeepSeek gera resposta
    if (isAiOnlyCategory(category)) {
      try {
        const raw = await deepseekComplete([
          { role: "system", content: ATB_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Mapeie o padrão de "${category}" para um arquétipo do tarot e gere orientação espiritual personalizada. Responda APENAS em JSON válido sem markdown: {"card":"Nome da Carta","cardMeaning":"significado (3-4 frases)","forces":["força 1","força 2"],"insight":"camada emocional (2-3 frases)","rituals":[{"name":"Nome","steps":["passo 1","passo 2","passo 3"]}],"routine":[{"period":"Manhã","steps":["ação 1","ação 2"]},{"period":"Noite","steps":["ação 1","ação 2"]}],"truth":"frase final"}`,
          },
        ]);
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({ mode: "rich", ...parsed });
      } catch {
        // Fallback seguro se DeepSeek falhar ou JSON inválido
        return NextResponse.json({
          mode: "rich",
          card: "A Torre",
          cardMeaning: "Um padrão interno precisa ser reconhecido e rompido para que você possa se libertar.",
          forces: ["Arcanjo Miguel — corta ligações pesadas", "Arcanjo Gabriel — acolhe a emoção"],
          insight: "Você não está aqui por acaso. Existe algo que se repete e pede sua atenção. O primeiro passo é observar sem julgamento.",
          rituals: [
            { name: "Ritual da Consciência", steps: ["Acenda uma vela branca em local seguro.", "Respire fundo 3 vezes.", "Diga: 'Eu vejo esse padrão. Eu escolho mudar.'"] },
          ],
          routine: [
            { period: "Manhã", steps: ["Beba um copo de água em jejum.", "Observe o primeiro impulso do dia sem agir imediatamente."] },
            { period: "Noite", steps: ["Antes de dormir, pergunte: 'Onde eu repeti o padrão hoje?' — sem culpa, só observação."] },
          ],
          truth: "Observar é o primeiro movimento real de mudança.",
        });
      }
    }

    return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
