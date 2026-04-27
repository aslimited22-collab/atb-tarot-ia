"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/Skeleton";
import { BackButton } from "@/components/BackButton";

type Reading = { card: string; interpretation: string; message: string };

export default function OraclePage() {
  const [data, setData] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/oracle")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error);
        else setData(d);
      })
      .catch(() => toast.error("Erro ao carregar oráculo"))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <BackButton />

      {/* Header com data */}
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🔮</div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 8, fontWeight: 700 }}>
          Carta do Dia
        </h1>
        <p style={{ fontSize: 17, color: "#fbf8ff", textTransform: "capitalize", fontWeight: 500 }}>
          {today}
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 60 }}>🔮</div>
            <p style={{ fontSize: 18, color: "#fbf8ff", fontWeight: 500 }}>
              ATB está consultando as cartas...
            </p>
            <div style={{ display: "flex", gap: 8 }}>
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
              Sua carta de hoje
            </div>
            <div className="serif" style={{ fontSize: "clamp(2.2rem, 5vw, 3rem)", color: "#e8b84b", lineHeight: 1.1, fontWeight: 700 }}>
              {data.card}
            </div>
          </div>

          {/* Interpretação */}
          <div style={{ marginBottom: 24 }}>
            <h3 className="serif" style={{ fontSize: "1.5rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
              ✨ O que essa carta diz
            </h3>
            <p style={{ fontSize: 18, color: "#fbf8ff", lineHeight: 1.7, whiteSpace: "pre-wrap", fontWeight: 500 }}>
              {data.interpretation}
            </p>
          </div>

          {/* Mensagem do dia */}
          {data.message && (
            <div style={{ paddingTop: 24, borderTop: "1px solid rgba(196,181,253,0.2)" }}>
              <h3 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
                💛 Mensagem para você
              </h3>
              <p style={{ fontSize: 18, color: "#d9cdfc", lineHeight: 1.7, fontStyle: "italic", fontWeight: 500 }}>
                {data.message}
              </p>
            </div>
          )}

          {/* Voltar amanhã */}
          <div style={{ marginTop: 28, padding: "16px 18px", background: "rgba(232,184,75,0.08)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.25)", textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
              🌙 Volte amanhã para uma nova carta
            </p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>😔</div>
          <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.6 }}>
            Não foi possível carregar a sua carta agora. Tente recarregar a página.
          </p>
        </div>
      )}
    </div>
  );
}
