import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATB_SYSTEM_PROMPT, deepseekStream } from "@/lib/deepseek";
import { MESSAGE_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "mensagem inválida" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("plan, messages_today, last_message_date")
      .eq("id", user.id)
      .maybeSingle();

    const plan: Plan = (profile?.plan as Plan) || "free";
    const today = new Date().toISOString().slice(0, 10);
    let used = profile?.last_message_date === today ? profile?.messages_today ?? 0 : 0;
    const limit = MESSAGE_LIMITS[plan];

    if (used >= limit) {
      return NextResponse.json(
        { error: "Você atingiu o limite de mensagens do seu plano. Faça upgrade para continuar." },
        { status: 429 }
      );
    }

    used += 1;
    await supabase.from("users").update({ messages_today: used, last_message_date: today }).eq("id", user.id);

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const prior = (history || []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    await supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: message });

    const upstream = await deepseekStream([
      { role: "system", content: ATB_SYSTEM_PROMPT },
      ...prior,
      { role: "user", content: message },
    ]);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Erro ao contatar IA" }, { status: 502 });
    }

    let full = "";
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const payload = t.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  full += delta;
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {}
            }
          }
        } catch (e) {
          controller.error(e);
          return;
        } finally {
          if (full) {
            await supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: full });
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "erro" }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: profile } = await supabase
    .from("users")
    .select("plan, messages_today, last_message_date")
    .eq("id", user.id)
    .maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";
  const today = new Date().toISOString().slice(0, 10);
  const used = profile?.last_message_date === today ? profile?.messages_today ?? 0 : 0;
  const limit = MESSAGE_LIMITS[plan];
  const remaining = limit === Infinity ? -1 : Math.max(0, limit - used);

  return NextResponse.json({
    messages: (data || []).reverse(),
    plan,
    remaining,
  });
}
