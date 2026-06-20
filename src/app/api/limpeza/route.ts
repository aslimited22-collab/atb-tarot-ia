import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LIMPEZA_GPT_SYSTEM_PROMPT, openaiStream } from "@/lib/openai";
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
    const rl = await rateLimit(`limpeza:${ip}`, 20, 60_000);
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

    // Busca o profile coletado para personalizar o system prompt
    const { data: profile } = await supabase
      .from("limpeza_profile")
      .select("full_name, age, marital_status, main_feeling, situation")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Por favor preencha seus dados antes de começar a limpeza.", needsProfile: true },
        { status: 400 }
      );
    }

    const FEELING_LABELS: Record<string, string> = {
      tristeza_profunda: "tristeza profunda na alma",
      ansiedade: "ansiedade que não passa",
      raiva: "raiva e mágoa engolidas",
      medo: "medo de tudo",
      vazio: "sensação de vazio",
      inveja_alheia: "sensação de inveja perto dela",
      energia_pesada: "energia pesada na vida",
      amor_bloqueado: "amor bloqueado, solidão",
      outro: "outro tipo de dor que ela vai contar",
    };

    const MARITAL_LABELS: Record<string, string> = {
      solteira: "solteira",
      casada: "casada",
      divorciada: "divorciada/separada",
      viuva: "viúva",
      uniao_estavel: "em união estável",
      outro: "estado civil reservado",
    };

    // Monta o contexto só com o que a cliente JÁ informou. No modo "Começar
    // agora" temos só o nome — então a ATB acolhe e pergunta o resto na conversa,
    // como uma médium de verdade (em vez de exigir formulário e perder a cliente).
    const ctxLines = [`- Nome: ${profile.full_name || "(ela ainda não disse o nome)"}`];
    if (profile.age) ctxLines.push(`- Idade: ${profile.age} anos`);
    if (profile.marital_status) ctxLines.push(`- Estado civil: ${MARITAL_LABELS[profile.marital_status] || profile.marital_status}`);
    if (profile.main_feeling) ctxLines.push(`- Dor principal que ela sente: ${FEELING_LABELS[profile.main_feeling] || profile.main_feeling}`);
    if (profile.situation) ctxLines.push(`- O que ela disse com as próprias palavras: "${profile.situation}"`);
    const faltaDados = !profile.main_feeling && !profile.situation;
    const profileContext = `CONTEXTO ESPIRITUAL DESTA CLIENTE (use esses dados para personalizar TUDO):
${ctxLines.join("\n")}

${faltaDados
  ? "A cliente ainda NÃO contou o que está pesando. Acolha com muito carinho, chame pelo nome (se tiver), e com delicadeza pergunte o que está no coração dela — o que ela quer limpar/resolver. A partir da resposta dela, conduza a limpeza."
  : "Use essas informações para chamá-la pelo nome, levar em conta a fase da vida dela, e adaptar a leitura ao que ela está sentindo. Não repita esses dados literalmente, apenas use como contexto interno."}`;

    const { data: userMsgRow } = await supabase
      .from("limpeza_messages")
      .insert({ user_id: user.id, role: "user", content: message })
      .select("id")
      .single();
    const userMsgId = userMsgRow?.id as string | undefined;

    // Idioma do cliente → ATB faz a limpeza na língua dele (persona intacta).
    const langMsg = languageDirective(getServerLocale());

    let upstream: Response;
    try {
      upstream = await openaiStream([
        { role: "system", content: LIMPEZA_GPT_SYSTEM_PROMPT },
        { role: "system", content: profileContext },
        ...(langMsg ? [{ role: "system" as const, content: langMsg }] : []),
        ...prior,
        { role: "user", content: message },
      ]);
    } catch (err) {
      // Falha de rede / API OpenAI: remove a mensagem do usuário (por ID,
      // não por content — evita apagar mensagens antigas com texto idêntico)
      if (userMsgId) {
        await supabase.from("limpeza_messages").delete().eq("id", userMsgId);
      }
      return NextResponse.json(
        { error: "Tivemos um problema de conexão com nossos santos. Tente novamente em alguns segundos." },
        { status: 502 }
      );
    }

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
  const rl = await rateLimit(`limpeza-get:${ip}`, 60, 60_000);
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
