// GET /auth/callback?token_hash=X&type=Y&next=Z
//
// Endpoint que processa o link mágico (OTP) clicado pelo cliente no email.
// Supabase Auth manda usuário pra cá → trocamos token_hash por session →
// redirecionamos pro `next` (default /dashboard).
//
// Também serve OAuth callbacks no futuro (Google, Apple) — o handler é genérico.

import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logInfo, logWarn } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") || "/dashboard";
  const code = url.searchParams.get("code"); // OAuth code (Google etc)

  const supabase = createClient();

  // Caso 1: magic-link OTP (email)
  if (token_hash && type) {
    const { error, data } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error && data.session) {
      logInfo("auth.callback", "otp verified", { userId: data.user?.id, type });
      return NextResponse.redirect(new URL(next, url.origin));
    }
    logWarn("auth.callback", "otp invalid", { error: error?.message, type });
    // Token expirado ou inválido — manda pro login com mensagem
    return NextResponse.redirect(new URL("/login?error=expired", url.origin));
  }

  // Caso 2: OAuth code (futuro — Google/Apple)
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      logInfo("auth.callback", "oauth verified", { userId: data.user?.id });
      return NextResponse.redirect(new URL(next, url.origin));
    }
    logWarn("auth.callback", "oauth invalid", { error: error?.message });
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  // Sem parâmetros válidos
  return NextResponse.redirect(new URL("/login?error=invalid", url.origin));
}
