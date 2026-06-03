import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ESPIRITO_MENTOR_GPT_PROMPT, openaiStream } from "@/lib/openai";
import { sanitizeInput, rateLimit, getClientIp } from "@/lib/security";
import { getServerLocale } from "@/lib/i18n/server";
import { languageDirective } from "@/lib/i18n/locales";

export const runtime = "nodejs";

const MAX_MESSAGES = 3;

async function hasPurchased(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from("purchases")
    .select("id")
    .eq("email", email.toLowerCase())
    .eq("plan", "espirito")
    .neq("event", "order.refunded")
    .neq("event", "order_refunded")
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`espirito:${ip}`, 20, 60_000);
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
        { error: "Você precisa adquirir a Sessão Espírita.", needsPurchase: true },
        { status: 402 }
      );
    }

    // Throttle 5s entre mensagens
    const { data: lastUserMsg } = await supabase
      .from("espirito_messages")
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

    // Limita 3 mensagens POR COMPRA (não lifetime). Cliente que comprou 2x
    // tem direito a 6 mensagens — conta apenas as enviadas desde a última compra.
    const { data: lastPurchase } = await supabase
      .from("purchases")
      .select("created_at")
      .eq("email", userEmail)
      .eq("plan", "espirito")
      .neq("event", "order.refunded")
      .neq("event", "order_refunded")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sessionStartIso = lastPurchase?.created_at || "1970-01-01T00:00:00Z";

    const { count } = await supabase
      .from("espirito_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", sessionStartIso);

    const used = count || 0;
    if (used >= MAX_MESSAGES) {
      return NextResponse.json(
        { error: "Você já usou suas 3 mensagens sagradas desta sessão.", limitReached: true },
        { status: 429 }
      );
    }

    const { data: history } = await supabase
      .from("espirito_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const prior = (history || []).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Profile pra contexto personalizado
    const { data: profile } = await supabase
      .from("espirito_profile")
      .select("full_name, age, lost_loved_one, who_to_talk, main_question")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Por favor preencha seus dados antes de começar a sessão.", needsProfile: true },
        { status: 400 }
      );
    }

    const LOST_LABELS: Record<string, string> = {
      mae: "mãe (já partiu)",
      pai: "pai (já partiu)",
      marido_esposa: "marido/esposa (já partiu)",
      filho: "filho/filha (já partiu)",
      irmao: "irmão/irmã (já partiu)",
      avo: "avô/avó (já partiu)",
      amigo: "amigo querido (já partiu)",
      outro: "alguém que ela amava muito (já partiu)",
      ninguem: "ninguém em específico — quer só conexão com guia espiritual",
    };

    const profileContext = `CONTEXTO ESPIRITUAL DESTA CLIENTE (use para personalizar a mensagem):
- Nome: ${profile.full_name}
- Idade: ${profile.age} anos
- Perdeu: ${LOST_LABELS[profile.lost_loved_one] || profile.lost_loved_one}
- Quem ela quer alcançar: ${profile.who_to_talk || "guia espiritual"}
- Pergunta principal: "${profile.main_question}"

Use o nome dela e o nome da pessoa do outro lado (${profile.who_to_talk || "guia mentor"}) na mensagem. Traga a mensagem desse espírito específico, com voz dele/dela, em primeira pessoa. Não repita os dados literalmente, apenas use como contexto.`;

    const { data: userMsgRow } = await supabase
      .from("espirito_messages")
      .insert({ user_id: user.id, role: "user", content: message })
      .select("id")
      .single();
    const userMsgId = userMsgRow?.id as string | undefined;

    // Idioma do cliente → o guia fala na língua dele (persona intacta).
    const langMsg = languageDirective(getServerLocale());

    let upstream: Response;
    try {
      upstream = await openaiStream([
        { role: "system", content: ESPIRITO_MENTOR_GPT_PROMPT },
        { role: "system", content: profileContext },
        ...(langMsg ? [{ role: "system" as const, content: langMsg }] : []),
        ...prior,
        { role: "user", content: message },
      ]);
    } catch {
      // Rollback por ID (filtrar por content podia apagar mensagens antigas iguais)
      if (userMsgId) {
        await supabase.from("espirito_messages").delete().eq("id", userMsgId);
      }
      return NextResponse.json({ error: "Erro na conexão espiritual. Tente novamente." }, { status: 502 });
    }

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Erro na conexão espiritual." }, { status: 502 });
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
            await supabase.from("espirito_messages").insert({
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
  const rl = await rateLimit(`espirito-get:${ip}`, 60, 60_000);
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

  // Janela da sessão atual = desde a última compra (3 msgs por compra)
  const { data: lastPurchase } = await supabase
    .from("purchases")
    .select("created_at")
    .eq("email", userEmail)
    .eq("plan", "espirito")
    .neq("event", "order.refunded")
    .neq("event", "order_refunded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sessionStartIso = lastPurchase?.created_at || "1970-01-01T00:00:00Z";

  const { data: messages } = await supabase
    .from("espirito_messages")
    .select("id, role, content, created_at")
    .eq("user_id", user.id)
    .gte("created_at", sessionStartIso)
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
