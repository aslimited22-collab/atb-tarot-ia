// POST /api/auth/login
// Endpoint server-side de login — adiciona rate limit por IP (anti-brute-force).
// Chama supabase.auth.signInWithPassword no servidor com cookies pra setar sessão.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { rateLimit, getClientIp } from "@/lib/security";
import { logWarn, logInfo } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // 10 tentativas / IP / hora — permissivo mas trava brute force óbvio
  const rl = await rateLimit(`login:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.ok) {
    logWarn("auth.login", "rate limited", { ip, retryAfter: rl.retryAfter });
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em uma hora." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 3600) } }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "missing credentials" }, { status: 400 });
  }
  if (password.length < 6 || password.length > 200) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  // Cria cliente Supabase SSR que escreve cookies no response
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
            });
          } catch {
            // Server Component env — set falha aqui mas Supabase tenta de novo
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    logWarn("auth.login", "failed", { ip, email });
    // Mensagem genérica pra não permitir user enumeration
    return NextResponse.json({ error: "Email ou senha incorretos." }, { status: 401 });
  }

  logInfo("auth.login", "success", { userId: data.user?.id });
  return NextResponse.json({ ok: true }, { status: 200 });
}
