// POST /api/limpeza/generate-preview
// Passo 1 da reforma do funil: gera SÓ a prévia espiritual (texto), sem criar
// order nem tocar no banco. A order só nasce no passo 2 (quando o cliente dá o
// e-mail), em /api/limpeza/preview — que aceita este previewText pra não gerar 2x.
//
// Assim tiramos o e-mail do passo 1 (menos atrito) sem mexer no schema NOT NULL
// de orders.email: o pedido continua nascendo com e-mail, só que no passo 2.
import { NextResponse } from "next/server";
import { sanitizeInput, rateLimit, getClientIp } from "@/lib/security";
import { generatePreview, VALID_THEMES, VALID_SIGNS, THEME_LABELS } from "@/lib/limpeza-v2";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`limpeza-genprev:${ip}`, 6, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde um momento." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
      );
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8_000) {
      return NextResponse.json({ error: "Dados muito longos." }, { status: 413 });
    }

    const body = await req.json().catch(() => ({}));

    const nameSan = sanitizeInput(String(body?.name || ""), 80);
    if (!nameSan.ok || nameSan.value.length < 2) {
      return NextResponse.json({ error: "Por favor preencha seu nome." }, { status: 400 });
    }
    const name = nameSan.value;

    const theme = String(body?.theme || "");
    if (!(VALID_THEMES as readonly string[]).includes(theme)) {
      return NextResponse.json({ error: "Selecione um tema." }, { status: 400 });
    }

    const qSan = sanitizeInput(String(body?.question || ""), 800);
    if (!qSan.ok || qSan.value.length < 10) {
      return NextResponse.json(
        { error: "Conte com suas palavras o que está sentindo (mínimo 10 caracteres)." },
        { status: 400 }
      );
    }
    const question = qSan.value;

    const signRaw = String(body?.sign || "").toLowerCase();
    const sign = VALID_SIGNS.includes(signRaw) ? signRaw : null;

    let previewText: string;
    try {
      previewText = await generatePreview({
        name,
        theme: THEME_LABELS[theme as keyof typeof THEME_LABELS] || theme,
        sign,
        question,
      });
    } catch {
      return NextResponse.json(
        { error: "Não conseguimos preparar sua prévia agora. Tente em alguns minutos." },
        { status: 502 }
      );
    }

    // Cap defensivo de 80 palavras (caso a IA passe)
    const words = previewText.split(/\s+/);
    if (words.length > 90) previewText = words.slice(0, 80).join(" ") + "...";

    return NextResponse.json({ ok: true, previewText });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
