"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";

const HIDDEN_PATHS = [
  "/dashboard",
  "/api",
  "/login",
  "/cadastro",
  // Todo o funil /limpeza* (form → prévia → oferta) tem seu próprio fluxo/CTA:
  // a barra global (R$100 direto) mostraria preço cedo demais e pularia a prévia.
  // (cobre /limpeza, /limpeza/previa, /limpeza/preview e /limpeza-espiritual)
  "/limpeza",
  "/entrega",
  "/admin",
  "/obrigado-",
  "/redefinir-senha",
  "/esqueci-senha",
];

export default function StickyMobileCTA() {
  const pathname = usePathname() || "";
  const { t } = useT();
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supa = createClient();
    supa.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setLoggedIn(!!data.user);
        setChecked(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Esconde nas rotas internas/auth/checkout
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;
  // Esconde até saber se está logado (evita flash)
  if (!checked) return null;
  // Logado não precisa do CTA de aquisição
  if (loggedIn) return null;

  return (
    <>
      {/* Spacer pra conteúdo não ficar atrás da barra */}
      <div className="sticky-cta-spacer" aria-hidden="true" />
      <a
        href="/api/checkout/limpeza"
        className="sticky-cta-bar"
        aria-label={`${t("landing.payment_cta")} — ${t("landing.limpeza_price")}`}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">🕊️</span>
        <span>{t("landing.payment_cta")} — <strong>{t("landing.limpeza_price")}</strong></span>
      </a>
      <style>{`
        .sticky-cta-spacer { display: none; }
        .sticky-cta-bar { display: none; }
        @media (max-width: 768px) {
          .sticky-cta-spacer {
            display: block;
            height: calc(env(safe-area-inset-bottom, 0) + 76px);
          }
          .sticky-cta-bar {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 14px 16px calc(env(safe-area-inset-bottom, 0) + 14px);
            background: linear-gradient(135deg, #e8b84b, #c9950a);
            color: #120025;
            font-size: 18px;
            font-weight: 800;
            text-align: center;
            text-decoration: none;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.45);
            z-index: 9997;
            min-height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            border-top: 2px solid rgba(232,184,75,0.7);
          }
          .sticky-cta-bar:active { opacity: 0.92; }
        }
      `}</style>
    </>
  );
}
