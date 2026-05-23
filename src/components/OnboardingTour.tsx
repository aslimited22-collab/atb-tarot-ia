"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";

// Onboarding tour pra primeira visita ao dashboard.
// Em vez de tooltips spatial-aware (frágeis em mobile), usamos modal sequencial
// fullscreen com 3 cards que se sucedem. Pro público 60+ isso é mais legível
// e funciona em qualquer viewport.
//
// Storage: localStorage['onboarding_done'] === '1' → não mostra.
// Botão "Pular" também marca como concluído.

const STORAGE_KEY = "onboarding_done_v1";

type Step = {
  emoji: string;
  titleKey: string;
  bodyKey: string;
};

const STEPS: Step[] = [
  { emoji: "🔮", titleKey: "onboarding.step1_title", bodyKey: "onboarding.step1_body" },
  { emoji: "💬", titleKey: "onboarding.step2_title", bodyKey: "onboarding.step2_body" },
  { emoji: "💛", titleKey: "onboarding.step3_title", bodyKey: "onboarding.step3_body" },
];

export default function OnboardingTour() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) !== "1") {
        // Pequeno delay pra layout estabilizar antes de mostrar
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage pode estar bloqueado (modo privado) — não mostra
    }
  }, []);

  function complete() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      complete();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(18, 0, 37, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "fadeIn 0.3s ease-out",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div
        key={step}
        style={{
          background: "linear-gradient(135deg, #1e0040 0%, #2a0055 50%, #1e0040 100%)",
          border: "2px solid rgba(232,184,75,0.5)",
          borderRadius: 24,
          padding: "40px 32px",
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          animation: "slideUp 0.4s ease-out",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 28 : 10,
                height: 10,
                borderRadius: 5,
                background: i === step ? "#e8b84b" : "rgba(232,184,75,0.3)",
                transition: "width 0.3s",
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        <div style={{ fontSize: 72, marginBottom: 20, lineHeight: 1 }} aria-hidden="true">
          {current.emoji}
        </div>

        <h2
          id="onboarding-title"
          style={{
            fontSize: "1.8rem",
            color: "#e8b84b",
            margin: "0 0 16px",
            lineHeight: 1.25,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          {t(current.titleKey as Parameters<typeof t>[0])}
        </h2>

        <p
          style={{
            fontSize: 18,
            color: "#fbf8ff",
            lineHeight: 1.65,
            margin: "0 0 32px",
            fontWeight: 500,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {t(current.bodyKey as Parameters<typeof t>[0])}
        </p>

        {/* Botão principal */}
        <button
          onClick={next}
          style={{
            background: "linear-gradient(135deg, #e8b84b, #c9950a)",
            color: "#120025",
            fontWeight: 800,
            fontSize: 19,
            padding: "18px 32px",
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(232,184,75,0.4)",
            width: "100%",
            minHeight: 64,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.01em",
          }}
        >
          {isLast ? `✨ ${t("onboarding.cta_start")}` : `${t("onboarding.cta_next")} →`}
        </button>

        {/* Pular */}
        {!isLast && (
          <button
            onClick={complete}
            style={{
              background: "transparent",
              border: "none",
              color: "#c4b5fd",
              fontSize: 15,
              padding: "14px 18px",
              marginTop: 12,
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
              textDecoration: "underline",
              minHeight: 48,
            }}
            aria-label={t("onboarding.skip")}
          >
            {t("onboarding.skip")}
          </button>
        )}

        {/* Contador */}
        <p style={{ fontSize: 13, color: "#9575cd", margin: "16px 0 0", fontFamily: "Inter, sans-serif" }}>
          {step + 1} / {STEPS.length}
        </p>
      </div>
    </div>
  );
}
