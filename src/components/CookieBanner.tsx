"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";

const CONSENT_COOKIE = "atb_cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

type Consent = "all" | "essential" | null;

function getConsent(): Consent {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${CONSENT_COOKIE}=([^;]+)`));
  if (!match) return null;
  const v = match[1];
  return v === "all" || v === "essential" ? v : null;
}

function setConsent(value: "all" | "essential") {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  // Notifica o AnalyticsWrapper pra reagir sem reload
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("atb-consent-changed"));
  }
}

export function CookieBanner() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) {
      // Pequeno delay pra não aparecer no flash inicial
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  function accept(value: "all" | "essential") {
    setConsent(value);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, rgba(30,0,64,0.98) 0%, rgba(18,0,37,0.99) 100%)",
        borderTop: "2px solid rgba(232,184,75,0.5)",
        boxShadow: "0 -8px 30px rgba(0,0,0,0.5)",
        padding: "24px 20px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 40, flexShrink: 0 }} aria-hidden="true">🍪</div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 id="cookie-banner-title" className="serif" style={{ fontSize: "1.5rem", color: "#e8b84b", margin: 0, marginBottom: 8, fontWeight: 700 }}>
              {t("cookie.title")}
            </h2>
            <p id="cookie-banner-desc" style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
              {t("cookie.desc")}{" "}
              <Link href="/cookies" style={{ color: "#e8b84b", textDecoration: "underline", fontWeight: 700 }}>
                {t("cookie.learn_more")}
              </Link>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => accept("essential")}
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "#fbf8ff",
              border: "1.5px solid rgba(196,181,253,0.4)",
              borderRadius: 12,
              padding: "18px 28px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              minHeight: 64,
              minWidth: 200,
            }}
          >
            {t("cookie.essential_only")}
          </button>
          <button
            type="button"
            onClick={() => accept("all")}
            style={{
              background: "linear-gradient(135deg,#e8b84b,#c9950a)",
              color: "#120025",
              border: "none",
              borderRadius: 12,
              padding: "18px 28px",
              fontSize: 18,
              fontWeight: 800,
              cursor: "pointer",
              minHeight: 64,
              minWidth: 200,
              boxShadow: "0 6px 18px rgba(232,184,75,0.35)",
            }}
          >
            {t("cookie.accept_all")}
          </button>
        </div>
      </div>
    </div>
  );
}
