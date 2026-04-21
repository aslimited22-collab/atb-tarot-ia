import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATB_SYSTEM_PROMPT, deepseekComplete } from "@/lib/deepseek";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";

async function getPlan(supabase: ReturnType<typeof createClient>, userId: string): Promise<Plan> {
  const { data } = await supabase.from("users").select("plan").eq("id", userId).maybeSingle();
  return (data?.plan as Plan) || "free";
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const plan = await getPlan(supabase, user.id);
  if (plan === "free") return NextResponse.json({ error: "upgrade" }, { status: 403 });

  const { data } = await supabase
    .from("journal_entries")
    .select("id, user_input, ai_response, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ entries: data || [] });
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const plan = await getPlan(supabase, user.id);
    if (plan === "free") return NextResponse.json({ error: "upgrade" }, { status: 403 });

    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "entrada inválida" }, { status: 400 });
    }

    const response = await deepseekComplete([
      { role: "system", content: ATB_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Este é um relato do meu diário sobre como estou me sentindo hoje. Responda com uma reflexão espiritual baseada em tarot e um conselho prático, acolhedor e direto. Relato:\n\n${input}`,
      },
    ]);

    const { data } = await supabase
      .from("journal_entries")
      .insert({ user_id: user.id, user_input: input, ai_response: response })
      .select("id, user_input, ai_response, created_at")
      .single();

    return NextResponse.json({ entry: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "erro" }, { status: 500 });
  }
}
