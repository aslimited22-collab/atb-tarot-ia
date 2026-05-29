// POST /api/auth/magic-link
// Envia magic-link (Supabase OTP) pro email do cliente.
// Cliente clica no link → /auth/callback?token_hash=X verifica → loga.
//
// Pra público 60+ isso elimina a barreira #1 (senha esquecida).
// Backward-compat: login por senha continua funcionando em /api/auth/login.
//
// Rate limited: 10 envios / IP / hora — subido de 5 pra acomodar 60+
// que recarrega pagina varias vezes ou aperta "Reenviar" multiplas.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/security";
import { logInfo, logWarn } from "@/lib/logger";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // 10 requests / IP / hora — defensivo mas tolerante pra 60+ que repete
  const rl = await rateLimit(`magic-link:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitos pedidos. Aguarde antes de tentar de novo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 3600) } }
    );
  }

  let body: { email?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  // Whitelist de paths pra evitar open redirect.
  // Default: /dashboard. Aceito quando vem de obrigado-pergunta: /dashboard/chat?welcome=pergunta.
  const safeNext = ((): string => {
    const candidate = body.next || "/dashboard";
    if (!candidate.startsWith("/dashboard")) return "/dashboard";
    return candidate;
  })();

  const supabase = createClient();
  const baseUrl = getSiteUrl(req);

  // shouldCreateUser=true permite signup automático no primeiro magic link.
  // Importante pra 60+ que pode não ter conta ainda — cria + loga em um clique.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    logWarn("auth.magic-link", "supabase error", { ip, error: error.message });
  } else {
    logInfo("auth.magic-link", "magic link sent", { ip });
  }

  // SEMPRE retorna OK (não vaza se email existe)
  return NextResponse.json({
    ok: true,
    message: "Te enviamos um link no email — clica nele pra entrar.",
  });
}
