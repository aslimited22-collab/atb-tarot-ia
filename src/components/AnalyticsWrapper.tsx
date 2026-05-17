"use client";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";

/**
 * Wrapper consent-aware do Vercel Web Analytics.
 *
 * Só monta o <Analytics /> se o usuário aceitou "todos" os cookies
 * (cookie atb_cookie_consent === "all").
 *
 * Se o usuário só aceita os essenciais, nada de tracking é carregado —
 * 100% LGPD compliant.
 *
 * Reage ao evento custom "atb-consent-changed" disparado pelo CookieBanner
 * pra ativar/desativar sem reload.
 */
export function AnalyticsWrapper() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const check = () => {
      const match = document.cookie.match(/atb_cookie_consent=([^;]+)/);
      setEnabled(match?.[1] === "all");
    };
    check();
    window.addEventListener("atb-consent-changed", check);
    return () => window.removeEventListener("atb-consent-changed", check);
  }, []);

  if (!enabled) return null;
  return <Analytics />;
}
