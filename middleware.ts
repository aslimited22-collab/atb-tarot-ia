import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { localeFromSignals } from "@/lib/i18n/locales";

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
    pathname.startsWith("/api/limpeza") ||
    pathname.startsWith("/api/espirito-mentor") ||
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

  // ============================================================
  // i18n: detecção de locale (BR-first). Regra: inglês SÓ por geo-IP de país
  // anglófono — nunca pelo idioma do aparelho (brasileira com celular em
  // inglês precisa ver PORTUGUÊS). Ver localeFromSignals em lib/i18n/locales.
  //
  // Escolha MANUAL (LangSwitcher) marca cookie 'atb_locale_set=1' e é
  // respeitada. Sem esse marcador, RE-DETECTAMOS por geo a cada load — assim
  // um cookie 'en' grudado por bug antigo se auto-corrige pra 'pt' no Brasil.
  // ============================================================
  // ?lang=xx na URL = escolha EXPLÍCITA (links de campanha, hreflang alternates
  // do layout — que apontavam pra /?lang=xx mas nada lia o parâmetro até aqui).
  // Grava os dois cookies (valor + marcador de escolha manual) e persiste.
  const urlLang = request.nextUrl.searchParams.get("lang");
  const VALID_LANGS = ["pt", "en", "es", "de", "it", "ja"];
  if (urlLang && VALID_LANGS.includes(urlLang)) {
    const response = await updateSession(request);
    const cookieOpts = {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax" as const,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    };
    response.cookies.set("atb_locale", urlLang, cookieOpts);
    response.cookies.set("atb_locale_set", "1", cookieOpts);
    return response;
  }

  const explicitChoice = request.cookies.get("atb_locale_set")?.value === "1";
  if (!explicitChoice) {
    const acceptLang = request.headers.get("accept-language") || "";
    const country = request.headers.get("x-vercel-ip-country") || "";
    const detected = localeFromSignals(country, acceptLang);

    const response = await updateSession(request);
    response.cookies.set("atb_locale", detected, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      // httpOnly: false intencional — LangSwitcher client-side precisa ler
    });
    return response;
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
