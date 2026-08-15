"use client";

import { useEffect } from "react";
import { GADS_ID, GA4_ID } from "@/components/GoogleAdsTag";

// Dispara o evento de conversão "Compra" do Google Ads nas páginas /obrigado-*.
// Requer NEXT_PUBLIC_GADS_PURCHASE_LABEL (o rótulo da ação de conversão "Compra",
// a parte depois da barra em AW-XXXX/RÓTULO). Sem o rótulo, não faz nada — a tag
// base (GoogleAdsTag) continua medindo visitas/remarketing normalmente.
// - transaction_id (order do Kiwify) deduplica reloads no próprio Google.
// - user_data.email liga as conversões aprimoradas (checkout é em outro domínio).
// Default = o rótulo REAL da ação "Compra" (valor público — aparece no `send_to`
// de qualquer anúncio). Com o default, a conversão dispara MESMO se a env var for
// esquecida na Vercel (era a causa dos "0 Compras"). Mesmo padrão do GADS_ID.
// A env var, se setada, tem prioridade.
const PURCHASE_LABEL = (process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL || "Vn61CImjkcccEPDd_p0q").trim();

type Props = {
  /** Valor da compra em BRL (ex.: 100 pra Limpeza). */
  value: number;
  /** ID do pedido (Kiwify order id) — dedupe. */
  orderId?: string;
  /** E-mail do comprador — conversões aprimoradas. */
  email?: string;
};

export default function GoogleAdsPurchase({ value, orderId, email }: Props) {
  useEffect(() => {
    const hasAds = !!(PURCHASE_LABEL && GADS_ID);
    const hasGa4 = !!GA4_ID;
    if (!hasAds && !hasGa4) return;
    // Dedupe local (além do transaction_id): evita re-disparo em re-render/reload na mesma sessão.
    const key = `gads_purchase_${orderId || value}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* sessionStorage indisponível — segue com o transaction_id como dedupe */
    }

    let tries = 0;
    const fire = () => {
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag !== "function") {
        // gtag.js ainda carregando (afterInteractive) — tenta de novo por até ~5s.
        if (tries++ < 10) setTimeout(fire, 500);
        return;
      }
      if (email) gtag("set", "user_data", { email: email.toLowerCase().trim() });
      if (hasAds) {
        gtag("event", "conversion", {
          send_to: `${GADS_ID}/${PURCHASE_LABEL}`,
          value,
          currency: "BRL",
          ...(orderId ? { transaction_id: orderId } : {}),
        });
      }
      if (hasGa4) {
        gtag("event", "purchase", {
          send_to: GA4_ID,
          value,
          currency: "BRL",
          ...(orderId ? { transaction_id: orderId } : {}),
        });
      }
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
    };
    fire();
  }, [value, orderId, email]);

  return null;
}
