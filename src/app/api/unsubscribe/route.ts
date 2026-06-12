// GET /api/unsubscribe?e=<email>&t=<hmac>
//
// Descadastro de e-mails de REMARKETING (LGPD). O token HMAC (gerado por
// unsubscribeUrl em remarketing-email.ts) garante que só quem recebeu o
// e-mail consegue descadastrar aquele endereço. Token inválido → 400 sem
// gravar nada. Idempotente: clicar 2x não dá erro.
//
// Só afeta remarketing — e-mails transacionais (acesso ao produto comprado,
// magic-link) continuam chegando.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/remarketing-email";
import { logInfo, logWarn } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, msg: string, ok: boolean): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#120025;font-family:Georgia,serif;color:#fbf8ff;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:480px;margin:24px;text-align:center;background:linear-gradient(135deg,#1e0040,#2a0055);border:2px solid rgba(232,184,75,0.5);border-radius:20px;padding:48px 32px;">
    <div style="font-size:56px;margin-bottom:16px;">${ok ? "🙏" : "⚠️"}</div>
    <h1 style="color:#e8b84b;font-size:26px;margin:0 0 12px;">${title}</h1>
    <p style="font-size:16px;line-height:1.6;color:#fbf8ff;margin:0;">${msg}</p>
  </div>
</body></html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  }) as NextResponse;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") || "").trim().toLowerCase();
  const token = url.searchParams.get("t") || "";

  if (!email || !email.includes("@") || !verifyUnsubscribeToken(email, token)) {
    logWarn("unsubscribe", "invalid token or email", { email: email.slice(0, 40) });
    return page(
      "Link inválido",
      "Este link de descadastro não é válido. Invalid unsubscribe link.",
      false
    );
  }

  try {
    const admin = createAdminClient();
    await admin.from("email_optouts").upsert({ email }, { onConflict: "email" });
    logInfo("unsubscribe", "optout saved", { email });
  } catch (e) {
    logWarn("unsubscribe", "optout save failed", { email, error: String(e) });
    return page(
      "Algo deu errado",
      "Não conseguimos processar agora. Tente novamente em instantes. / Something went wrong, please try again.",
      false
    );
  }

  return page(
    "Você foi descadastrada",
    "Você não vai mais receber nossos lembretes. Se mudar de ideia, é só voltar quando o coração pedir. 💛<br/><br/>You will no longer receive our reminders.",
    true
  );
}
