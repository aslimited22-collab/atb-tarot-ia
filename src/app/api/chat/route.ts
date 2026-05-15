import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATB_SYSTEM_PROMPT, deepseekStream } from "@/lib/deepseek";
import { MESSAGE_LIMITS_MONTH, THROTTLE_SECONDS, currentMonthKey } from "@/lib/plans";
import { sanitizeInput, rateLimit, getClientIp } from "@/lib/security";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // Rate limit por IP: 60 req/min (contra bots)
    const rl = await rateLimit(`chat:${ip}`, 60, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Aguarde um momento." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Limite de corpo: rejeitar payloads > 8KB
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8_000) {
      return NextResponse.json({ error: "Mensagem muito longa." }, { status: 413 });
    }

    const body = await req.json();
    const raw = body?.message;

    // Sanitiza e valida input
    const sanity = sanitizeInput(raw, 1500);
    if (!sanity.ok) {
      return NextResponse.json({ error: sanity.reason }, { status: 400 });
    }
    const message = sanity.value;

    const { data: profile } = await supabase
      .from("users")
      .select("plan, messages_today, last_message_date, messages_month, last_message_month")
      .eq("id", user.id)
      .maybeSingle();

    const plan: Plan = (profile?.plan as Plan) || "free";

    if (plan === "free") {
      // Plano grátis não envia mensagens — converter direto.
      return NextResponse.json(
        {
          error: "Para conversar com a ATB, escolha um plano. Você só paga uma vez por mês.",
          needsUpgrade: true,
        },
        { status: 402 }
      );
    }

    const monthKey = currentMonthKey();
    const usedMonth = profile?.last_message_month === monthKey ? profile?.messages_month ?? 0 : 0;
    const limit = MESSAGE_LIMITS_MONTH[plan];
    if (usedMonth >= limit) {
      return NextResponse.json(
        { error: `Você atingiu o limite de ${limit} mensagens deste mês no seu plano. Faça upgrade ou aguarde o próximo mês.` },
        { status: 429 }
      );
    }

    const { data: lastMsg } = await supabase
      .from("chat_messages")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const throttle = THROTTLE_SECONDS[plan];
    if (lastMsg?.created_at) {
      const diff = (Date.now() - new Date(lastMsg.created_at).getTime()) / 1000;
      if (diff < throttle) {
        const wait = Math.ceil(throttle - diff);
        return NextResponse.json(
          { error: `Aguarde ${wait}s antes de enviar outra mensagem.` },
          { status: 429, headers: { "Retry-After": String(wait) } }
        );
      }
    }

    // NÃO incrementamos cota agora — só cobramos se a IA realmente responder.
    // Isso evita "queimar" mensagem do usuário em caso de 502 da DeepSeek.
    const admin = createAdminClient();

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const prior = (history || []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    await supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: message });

    let upstream: Response;
    try {
      upstream = await deepseekStream([
        { role: "system", content: ATB_SYSTEM_PROMPT },
        ...prior,
        { role: "user", content: message },
      ]);
    } catch {
      // Falha de rede / DeepSeek antes de qualquer chunk — rollback da
      // mensagem do usuário e nenhum incremento de cota.
      await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id)
        .eq("role", "user")
        .eq("content", message);
      return NextResponse.json({ error: "Erro na consulta" }, { status: 502 });
    }

    if (!upstream.ok || !upstream.body) {
      await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id)
        .eq("role", "user")
        .eq("content", message);
      return NextResponse.json({ error: "Erro na consulta" }, { status: 502 });
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
            // Sucesso: persiste resposta + incrementa cota mensal
            await supabase.from("chat_messages").insert({
              user_id: user.id, role: "assistant", content: full,
            });
            await admin
              .from("users")
              .update({
                messages_month: usedMonth + 1,
                last_message_month: monthKey,
              })
              .eq("id", user.id);
          } else {
            // Stream abriu mas não veio conteúdo — rollback
            await supabase
              .from("chat_messages")
              .delete()
              .eq("user_id", user.id)
              .eq("role", "user")
              .eq("content", message);
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
    .select("plan, messages_today, last_message_date, messages_month, last_message_month, name, email")
    .eq("id", user.id)
    .maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";
  const monthKey = currentMonthKey();

  // Free não envia mensagens — sempre 0. Outros planos: cota mensal.
  let remaining: number;
  if (plan === "free") {
    remaining = 0;
  } else {
    const usedMonth = profile?.last_message_month === monthKey ? profile?.messages_month ?? 0 : 0;
    const limit = MESSAGE_LIMITS_MONTH[plan];
    remaining = Math.max(0, limit - usedMonth);
  }

  const rawName = (profile?.name as string) || "";
  const emailPrefix = (profile?.email || user.email || "").split("@")[0] || "";
  const fallback = emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : "";
  const displayName = rawName.trim().split(" ")[0] || fallback || "Alma";

  return NextResponse.json({ messages: (data || []).reverse(), plan, remaining, name: displayName });
}
