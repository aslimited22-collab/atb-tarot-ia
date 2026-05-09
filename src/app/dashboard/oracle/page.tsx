"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/Skeleton";
import { BackButton } from "@/components/BackButton";
import { useT } from "@/lib/i18n/I18nProvider";

type Reading = { card: string; interpretation: string; message: string };

const LOCALE_BY_KEY: Record<string, string> = {
  pt: "pt-BR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT", ja: "ja-JP",
};

export default function OraclePage() {
  const { t, locale } = useT();
  const [data, setData] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/oracle")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error);
        else setData(d);
      })
      .catch(() => toast.error(t("chat.oracle_load_error")))
      .finally(() => setLoading(false));
  }, [t]);

  const today = new Date().toLocaleDateString(LOCALE_BY_KEY[locale] || "en-US", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <BackButton />

      {/* Header com data */}
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }} aria-hidden="true">🔮</div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 8, fontWeight: 700 }}>
          {t("oracle.h1")}
        </h1>
        <p style={{ fontSize: 17, color: "#fbf8ff", textTransform: "capitalize", fontWeight: 500 }}>
          {today}
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 60 }} aria-hidden="true">🔮</div>
            <p style={{ fontSize: 18, color: "#fbf8ff", fontWeight: 500 }}>
              {t("oracle.loading")}
            </p>
            <div style={{ display: "flex", gap: 8 }} aria-hidden="true">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        </div>
      ) : data ? (
        <div className="card" style={{ padding: "32px 26px" }}>
          {/* Carta principal */}
          <div style={{ textAlign: "center", marginBottom: 28, padding: "20px 16px", background: "linear-gradient(135deg, rgba(232,184,75,0.15), rgba(232,184,75,0.05))", borderRadius: 16, border: "2px solid rgba(232,184,75,0.4)" }}>
            <div style={{ fontSize: 13, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 700 }}>
              {t("oracle.card_eyebrow")}
            </div>
            <div className="serif" style={{ fontSize: "clamp(2.2rem, 5vw, 3rem)", color: "#e8b84b", lineHeight: 1.1, fontWeight: 700 }}>
              {data.card}
            </div>
          </div>

          {/* Interpretação */}
          <div style={{ marginBottom: 24 }}>
            <h3 className="serif" style={{ fontSize: "1.5rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
              {t("oracle.interpretation_h3")}
            </h3>
            <p style={{ fontSize: 18, color: "#fbf8ff", lineHeight: 1.7, whiteSpace: "pre-wrap", fontWeight: 500 }}>
              {data.interpretation}
            </p>
          </div>

          {/* Mensagem do dia */}
          {data.message && (
            <div style={{ paddingTop: 24, borderTop: "1px solid rgba(196,181,253,0.2)" }}>
              <h3 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
                {t("oracle.message_h3")}
              </h3>
              <p style={{ fontSize: 18, color: "#d9cdfc", lineHeight: 1.7, fontStyle: "italic", fontWeight: 500 }}>
                {data.message}
              </p>
            </div>
          )}

          {/* Voltar amanhã */}
          <div style={{ marginTop: 28, padding: "16px 18px", background: "rgba(232,184,75,0.08)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.25)", textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
              {t("oracle.come_back")}
            </p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 16 }} aria-hidden="true">😔</div>
          <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.6 }}>
            {t("oracle.fail")}
          </p>
        </div>
      )}
    </div>
  );
}
