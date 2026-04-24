import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATB_SYSTEM_PROMPT, deepseekComplete } from "@/lib/deepseek";
import { sanitizeInput, rateLimit, getClientIp } from "@/lib/security";
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
    const ip = getClientIp(req);
    const rl = rateLimit(`journal:${ip}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "Muitas requisições. Aguarde." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const plan = await getPlan(supabase, user.id);
    if (plan === "free") return NextResponse.json({ error: "upgrade" }, { status: 403 });

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8_000) return NextResponse.json({ error: "Texto muito longo." }, { status: 413 });

    const body = await req.json();
    const sanity = sanitizeInput(body?.input, 2000);
    if (!sanity.ok) return NextResponse.json({ error: sanity.reason }, { status: 400 });

    const response = await deepseekComplete([
      { role: "system", content: ATB_SYSTEM_PROMPT },
      { role: "user", content: `Este é um relato do meu diário sobre como estou me sentindo hoje. Responda com uma reflexão espiritual baseada em tarot e um conselho prático, acolhedor e direto. Relato:\n\n${sanity.value}` },
    ]);

    const { data } = await supabase
      .from("journal_entries")
      .insert({ user_id: user.id, user_input: sanity.value, ai_response: response })
      .select("id, user_input, ai_response, created_at")
      .single();

    return NextResponse.json({ entry: data });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
