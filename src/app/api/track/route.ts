// POST /api/track — registra eventos de tráfego (visita/clique) pra atribuição.
//
// 100% aditivo e isolado: NÃO toca em checkout, pagamento, auth ou liberação de
// plano. Falha aqui NUNCA quebra o cliente (sempre responde 200/ok:false e segue).
// Escreve em public.track_events via service-role (cliente não acessa a tabela).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/security";

export const runtime = "nodejs";

const EVENTS = new Set(["visit", "cta_click"]);
const clip = (s: unknown, n = 200): string | null =>
  typeof s === "string" && s.trim() ? s.trim().slice(0, n) : null;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(`track:${ip}`, 80, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

    const b = await req.json().catch(() => ({} as Record<string, unknown>));
    if (!EVENTS.has(String((b as any)?.event))) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const admin = createAdminClient();
    await admin.from("track_events").insert({
      visitor_id: clip((b as any).visitor_id, 64),
      event: String((b as any).event),
      plan: clip((b as any).plan, 40),
      utm_source: clip((b as any).utm_source),
      utm_medium: clip((b as any).utm_medium),
      utm_campaign: clip((b as any).utm_campaign),
      utm_content: clip((b as any).utm_content),
      utm_term: clip((b as any).utm_term),
      referrer: clip((b as any).referrer, 500),
      path: clip((b as any).path, 200),
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Nunca propaga erro pro cliente — tracking é best-effort.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
