"use client";

import { useEffect } from "react";
import { GADS_ID, GA4_ID } from "@/components/GoogleAdsTag";

// Conversão "Iniciar checkout" do Google Ads: dispara no clique de QUALQUER
// botão/link de compra (a[href*="/api/checkout/"]), antes do redirect ao
// pagamento. Não bloqueia a navegação: transport_type 'beacon' envia o hit
// mesmo com a página descarregando. Mesmo padrão de captura do AttributionTracker.
// Rótulo via env (Production-only na Vercel) — sem a env, não dispara (dev/preview ok).
const CHECKOUT_LABEL = (process.env.NEXT_PUBLIC_GADS_CHECKOUT_LABEL || "").trim();

export default function GoogleAdsFunnelEvents() {
  useEffect(() => {
    // Liga o listener se HOUVER algo pra disparar (Ads e/ou GA4) — os dois são
    // independentes: falta de CHECKOUT_LABEL não deve impedir o GA4 de medir.
    if ((!CHECKOUT_LABEL || !GADS_ID) && !GA4_ID) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Dois formatos de botão de compra no site:
      //  - /api/checkout/[plan] (home, dashboard, e-mails) — roteador BR/intl
      //  - pay.kiwify.com.br direto (botão dourado do funil /limpeza pós-prévia)
      const link = target?.closest?.('a[href*="/api/checkout/"], a[href*="pay.kiwify.com.br"]');
      if (!link) return;
      // Se o gtag.js (afterInteractive) ainda não carregou, cria o stub padrão
      // que ENFILEIRA no dataLayer — o gtag.js drena a fila quando carregar.
      // Antes: early-return → clique rápido em 3G perdia o begin_checkout.
      const w = window as unknown as { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
      if (typeof w.gtag !== "function") {
        w.dataLayer = w.dataLayer || [];
        w.gtag = function gtag() {
          // eslint-disable-next-line prefer-rest-params
          (w.dataLayer as unknown[]).push(arguments);
        };
      }
      const gtag = w.gtag;
      if (CHECKOUT_LABEL && GADS_ID) {
        gtag("event", "conversion", {
          send_to: `${GADS_ID}/${CHECKOUT_LABEL}`,
          transport_type: "beacon",
        });
      }
      if (GA4_ID) {
        gtag("event", "begin_checkout", { send_to: GA4_ID, transport_type: "beacon" });
      }
    };
    document.addEventListener("click", onClick, true);
    // auxclick: middle-click abre em nova aba SEM disparar "click" — sem este
    // listener, a conversão de checkout não era registrada nesse caminho.
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  return null;
}
