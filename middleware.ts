import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// User-Agents de bots, scrapers e ferramentas de ataque
const BOT_PATTERNS = [
  /curl\//i, /wget\//i, /python-requests/i, /axios\//i,
  /java\//i, /go-http-client/i, /ruby/i, /php/i,
  /scrapy/i, /httpclient/i, /okhttp/i, /libwww/i,
  /nikto/i, /sqlmap/i, /nmap/i, /masscan/i,
  /zgrab/i, /nuclei/i, /dirbuster/i, /gobuster/i,
  /wfuzz/i, /hydra/i, /burpsuite/i, /zaproxy/i,
];

// IPs bloqueados permanentemente (preencher conforme ataques detectados)
const BLOCKED_IPS = new Set<string>([]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  // Bloqueia IPs na lista negra
  if (BLOCKED_IPS.has(ip)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Bloqueia bots em rotas de API de IA (não no webhook — Kiwify é um bot legítimo)
  const isAiRoute = pathname.startsWith("/api/chat") ||
    pathname.startsWith("/api/oracle") ||
    pathname.startsWith("/api/journal") ||
    pathname.startsWith("/api/addiction") ||
    pathname.startsWith("/api/auth");

  if (isAiRoute) {
    const ua = request.headers.get("user-agent") || "";

    // User-Agent de bot/tool conhecido (curl, sqlmap, etc)
    // Não bloqueamos UA vazio — alguns proxies móveis removem o header
    if (ua && BOT_PATTERNS.some((p) => p.test(ua))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Bloqueia cross-origin em POST (exceto webhook)
    // Safari iOS pode omitir Origin — só bloqueamos quando Origin está PRESENTE e não bate
    if (request.method === "POST" && pathname !== "/api/webhooks/kiwify") {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      if (origin && host) {
        try {
          const originHost = new URL(origin).host.split(":")[0];
          const reqHost = host.split(":")[0];
          if (originHost !== reqHost) {
            return new NextResponse("Forbidden", { status: 403 });
          }
        } catch {
          // Origin malformado — ignora
        }
      }
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
