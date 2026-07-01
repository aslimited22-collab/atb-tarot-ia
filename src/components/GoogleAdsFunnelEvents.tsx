"use client";

import { useEffect } from "react";
import { GADS_ID } from "@/components/GoogleAdsTag";

// Conversão "Iniciar checkout" do Google Ads: dispara no clique de QUALQUER
// botão/link de compra (a[href*="/api/checkout/"]), antes do redirect ao
// pagamento. Não bloqueia a navegação: transport_type 'beacon' envia o hit
// mesmo com a página descarregando. Mesmo padrão de captura do AttributionTracker.
// Rótulo via env (Production-only na Vercel) — sem a env, não dispara (dev/preview ok).
const CHECKOUT_LABEL = process.env.NEXT_PUBLIC_GADS_CHECKOUT_LABEL || "";

export default function GoogleAdsFunnelEvents() {
  useEffect(() => {
    if (!CHECKOUT_LABEL || !GADS_ID) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.('a[href*="/api/checkout/"]');
      if (!link) return;
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag !== "function") return;
      gtag("event", "conversion", {
        send_to: `${GADS_ID}/${CHECKOUT_LABEL}`,
        transport_type: "beacon",
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
