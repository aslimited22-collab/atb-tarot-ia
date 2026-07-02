"use client";
// Captura de atribuição de tráfego (UTM) — best-effort, anônimo, client-side.
//
// O que faz: na 1ª entrada guarda a origem (utm_*/referrer) num cookie first-party
// e registra um evento 'visit'. Também escuta cliques em qualquer link de checkout
// (/api/checkout/*) e registra 'cta_click' com o plano — pra medir intenção por canal.
//
// NÃO toca em checkout/pagamento/auth. Falha aqui não afeta nada (try/catch + beacon).
import { useEffect } from "react";

function getCookie(n: string): string | null {
  const m = document.cookie.match(new RegExp("(?:^|; )" + n.replace(/([.*+?^${}()|[\]\\])/g, "\\$1") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(n: string, v: string, days: number) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${n}=${encodeURIComponent(v)}; expires=${exp}; path=/; SameSite=Lax`;
}
function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  } catch {
    /* best-effort */
  }
}

export default function AttributionTracker() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams;
      const cur = {
        utm_source: q.get("utm_source"),
        utm_medium: q.get("utm_medium"),
        utm_campaign: q.get("utm_campaign"),
        utm_content: q.get("utm_content"),
        utm_term: q.get("utm_term"),
      };
      // id anônimo first-party (não identifica a pessoa)
      let vid = getCookie("atb_vid");
      if (!vid) {
        vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        setCookie("atb_vid", vid, 365);
      }
      // first-touch: guarda a 1ª origem por 90 dias
      const hasUtm = Object.values(cur).some(Boolean);
      if (hasUtm && !getCookie("atb_attr")) {
        setCookie("atb_attr", JSON.stringify({ ...cur, referrer: document.referrer || null }), 90);
      }
      // Click IDs do Google Ads (gclid/gbraid/wbraid) — LAST-touch: um novo clique
      // de anúncio sobrescreve o anterior (janela de conversão da conta = 90 dias).
      // Cookie (o backend lê ao montar a URL do checkout Kiwify) + localStorage
      // (redundância). Captura própria — não depende da tag gtag nem do _gcl_aw.
      const click = {
        gclid: q.get("gclid"),
        gbraid: q.get("gbraid"),
        wbraid: q.get("wbraid"),
      };
      if (Object.values(click).some(Boolean)) {
        const packed = JSON.stringify(click);
        setCookie("atb_gclid", packed, 90);
        try { localStorage.setItem("atb_gclid", packed); } catch { /* ignore */ }
      }
      let attr: Record<string, string | null> | null = null;
      try { attr = JSON.parse(getCookie("atb_attr") || "null"); } catch { /* ignore */ }
      const utm = {
        utm_source: cur.utm_source || attr?.utm_source || null,
        utm_medium: cur.utm_medium || attr?.utm_medium || null,
        utm_campaign: cur.utm_campaign || attr?.utm_campaign || null,
        utm_content: cur.utm_content || attr?.utm_content || null,
        utm_term: cur.utm_term || attr?.utm_term || null,
      };

      send({ event: "visit", visitor_id: vid, path: url.pathname, referrer: document.referrer || null, ...utm });

      const onClick = (e: MouseEvent) => {
        const t = e.target as HTMLElement | null;
        const a = t?.closest?.("a[href*='/api/checkout/']") as HTMLAnchorElement | null;
        if (!a) return;
        const m = (a.getAttribute("href") || "").match(/\/api\/checkout\/([a-z0-9]+)/i);
        send({ event: "cta_click", visitor_id: vid, plan: m?.[1] || null, path: url.pathname, ...utm });
      };
      document.addEventListener("click", onClick, true);
      return () => document.removeEventListener("click", onClick, true);
    } catch {
      /* best-effort */
    }
  }, []);
  return null;
}
