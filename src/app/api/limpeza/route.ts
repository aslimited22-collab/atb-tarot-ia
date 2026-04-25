import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LIMPEZA_SYSTEM_PROMPT, deepseekStream } from "@/lib/deepseek";
import { sanitizeInput, rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

const MAX_MESSAGES = 3;

async function hasPurchased(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from("purchases")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("plan", "limpeza")
    .neq("event", "order.refunded")
    .neq("event", "order_refunded")
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`limpeza:${ip}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Aguarde um momento." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8_000) {
      return NextResponse.json({ error: "Mensagem muito longa." }, { status: 413 });
    }

    const body = await req.json();
    const sanity = sanitizeInput(body?.message, 1500);
    if (!sanity.ok) {
      return NextResponse.json({ error: sanity.reason }, { status: 400 });
    }
    const message = sanity.value;

    const userEmail = (user.email || "").toLowerCase();
    const purchased = await hasPurchased(supabase, userEmail);
    if (!purchased) {
      return NextResponse.json(
        { error: "Você precisa adquirir a Limpeza Espiritual para continuar.", needsPurchase: true },
        { status: 402 }
      );
    }

    // Throttle de 5s entre mensagens (evita race condition + spam de cliques)
    const { data: lastUserMsg } = await supabase
      .from("limpeza_messages")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastUserMsg?.created_at) {
      const diff = (Date.now() - new Date(lastUserMsg.created_at).getTime()) / 1000;
      if (diff < 5) {
        const wait = Math.ceil(5 - diff);
        return NextResponse.json(
          { error: `Aguarde ${wait}s antes de enviar outra mensagem.` },
          { status: 429, headers: { "Retry-After": String(wait) } }
        );
      }
    }

    const { count } = await supabase
      .from("limpeza_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user");

    const used = count || 0;
    if (used >= MAX_MESSAGES) {
      return NextResponse.json(
        { error: "Você já usou suas 3 mensagens sagradas desta limpeza.", limitReached: true },
        { status: 429 }
      );
    }

    const { data: history } = await supabase
      .from("limpeza_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const prior = (history || []).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    await supabase.from("limpeza_messages").insert({ user_id: user.id, role: "user", content: message });

    const upstream = await deepseekStream([
      { role: "system", content: LIMPEZA_SYSTEM_PROMPT },
      ...prior,
      { role: "user", content: message },
    ]);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Erro na consulta espiritual" }, { status: 502 });
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
                if (delta) { full += delta; controller.enqueue(encoder.encode(delta)); }
              } catch {}
            }
          }
        } catch (e) {
          controller.error(e);
          return;
        } finally {
          if (full) {
            await supabase.from("limpeza_messages").insert({
              user_id: user.id, role: "assistant", content: full,
            });
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`limpeza-get:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas requisições." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userEmail = (user.email || "").toLowerCase();
  const purchased = await hasPurchased(supabase, userEmail);

  const { data: messages } = await supabase
    .from("limpeza_messages")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(50);

  const userCount = (messages || []).filter((m) => m.role === "user").length;
  const remaining = Math.max(0, MAX_MESSAGES - userCount);

  return NextResponse.json({
    purchased,
    messages: messages || [],
    remaining,
    max: MAX_MESSAGES,
  });
}
