// POST /api/auth/reset-password
// Envia e-mail de reset de senha via Supabase Auth.
// Rate-limited pra prevenir abuso (envio de spam).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/security";
import { logInfo, logWarn } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // 5 requests / IP / hora — previne flood de e-mails
  const rl = await rateLimit(`reset:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitos pedidos. Aguarde antes de tentar de novo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 3600) } }
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const supabase = createClient();
  const baseUrl = getSiteUrl(req);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/redefinir-senha`,
  });

  if (error) {
    logWarn("auth.reset", "supabase error", { ip, error: error.message });
    // Mensagem genérica — não vazamos se o e-mail existe ou não
  } else {
    logInfo("auth.reset", "reset email sent", { ip });
  }

  // SEMPRE retorna OK (evita user enumeration)
  return NextResponse.json({
    ok: true,
    message: "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
  });
}
