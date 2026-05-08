"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/I18nProvider";

type FullJson = {
  title: string;
  opening: string;
  spiritual_reading: string;
  cleansing_message: string;
  protection_message: string;
  next_steps: string[];
  closing: string;
  disclaimer: string;
};

type Props = {
  orderId: string;
  firstName: string;
  fullJson: FullJson | null;
  fullText: string | null;
  generationStatus: string;
  whatsappUrl: string | null;
};

export function EntregaClient({
  orderId,
  firstName,
  fullJson: initialJson,
  fullText: initialText,
  generationStatus: initialStatus,
  whatsappUrl,
}: Props) {
  const [json, setJson] = useState<FullJson | null>(initialJson);
  const [text, setText] = useState<string | null>(initialText);
  const [status, setStatus] = useState(initialStatus);
  const [generating, setGenerating] = useState(false);
  const { t } = useT();

  // Se ainda não está pronto, dispara geração e poll a cada 5s
  useEffect(() => {
    if (json) return;
    if (generating) return;

    let cancelled = false;
    let pollTimer: any;

    async function ensureGenerated() {
      setGenerating(true);
      try {
        const res = await fetch("/api/limpeza/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.full_json) {
          setJson(data.full_json);
          setText(data.full_text);
          setStatus("completed");
        } else if (data.status === "pending") {
          // Pagamento ainda não confirmado: poll a cada 5s
          pollTimer = setTimeout(ensureGenerated, 5000);
        } else if (res.status === 502) {
          // Erro de geração: espera 10s e tenta de novo
          pollTimer = setTimeout(ensureGenerated, 10000);
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    }

    ensureGenerated();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [orderId, json, generating]);

  function copyToClipboard() {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(t("v2.delivery.copied"));
  }

  function printPage() {
    window.print();
  }

  return (
    <main style={{ background: "#120025", color: "#fbf8ff", minHeight: "100vh", padding: "32px 20px 80px" }}>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .card, .card-gold { border: 1px solid #ccc !important; background: white !important; color: black !important; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header sagrado */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            borderRadius: 22,
            overflow: "hidden",
            marginBottom: 22,
            boxShadow: "0 18px 50px rgba(232,184,75,0.3)",
            maxWidth: 560,
            margin: "0 auto 22px",
          }} className="no-print">
            <Image
              src="/img/limpeza-altar.png"
              alt="Altar"
              width={1536}
              height={1024}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          <h1 className="serif" style={{
            fontSize: "clamp(1.9rem, 5vw, 2.6rem)",
            color: "#e8b84b",
            lineHeight: 1.1,
            marginBottom: 12,
            fontWeight: 700,
          }}>
            {t("v2.delivery.title").replace("{name}", firstName)}
          </h1>
          <p style={{ fontSize: 17, color: "#c4b5fd", lineHeight: 1.55, fontStyle: "italic" }}>
            {t("v2.delivery.blessing")}
          </p>
        </div>

        {/* Aguardando */}
        {!json && (
          <div className="card" style={{ padding: "32px 24px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", gap: 8, marginBottom: 16 }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.65, fontWeight: 500 }}>
              {t("v2.delivery.preparing")}
            </p>
            <p style={{ fontSize: 14, color: "#9575cd", marginTop: 12, lineHeight: 1.55 }}>
              {t("v2.delivery.preparing_hint")}
            </p>
          </div>
        )}

        {/* Conteúdo completo */}
        {json && (
          <article className="card" style={{ padding: "32px 26px", marginBottom: 22 }}>
            {/* Título */}
            <h2 className="serif" style={{
              fontSize: "clamp(1.7rem, 4vw, 2.2rem)",
              color: "#e8b84b",
              textAlign: "center",
              lineHeight: 1.15,
              marginBottom: 24,
              fontWeight: 700,
              padding: "16px 14px",
              background: "rgba(232,184,75,0.08)",
              borderRadius: 14,
              border: "1px solid rgba(232,184,75,0.3)",
            }}>
              {json.title}
            </h2>

            {/* Abertura */}
            <p style={{ fontSize: 18, color: "#fbf8ff", lineHeight: 1.75, marginBottom: 26, fontWeight: 500 }}>
              {json.opening}
            </p>

            {/* Leitura espiritual */}
            <h3 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
              {t("v2.delivery.reading")}
            </h3>
            <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.75, marginBottom: 28, fontWeight: 500 }}>
              {json.spiritual_reading}
            </p>

            {/* Limpeza */}
            <h3 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
              {t("v2.delivery.cleansing")}
            </h3>
            <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.75, marginBottom: 28, fontWeight: 500 }}>
              {json.cleansing_message}
            </p>

            {/* Proteção */}
            <h3 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
              {t("v2.delivery.protection")}
            </h3>
            <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.75, marginBottom: 28, fontWeight: 500 }}>
              {json.protection_message}
            </p>

            {/* Próximos passos */}
            <h3 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 14, fontWeight: 700 }}>
              {t("v2.delivery.steps")}
            </h3>
            <ol style={{ paddingLeft: 0, listStyle: "none", marginBottom: 28 }}>
              {json.next_steps.map((step, i) => (
                <li key={i} style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: "12px 16px",
                  background: "rgba(232,184,75,0.06)",
                  border: "1px solid rgba(232,184,75,0.2)",
                  borderRadius: 12,
                  marginBottom: 10,
                }}>
                  <span style={{
                    flexShrink: 0,
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #e8b84b, #c9950a)",
                    color: "#120025",
                    fontSize: 18, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 16, color: "#fbf8ff", lineHeight: 1.65, fontWeight: 500, paddingTop: 4 }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            {/* Fechamento */}
            <div style={{
              padding: "20px 18px",
              background: "linear-gradient(135deg, rgba(232,184,75,0.15), rgba(232,184,75,0.05))",
              border: "2px solid rgba(232,184,75,0.4)",
              borderRadius: 14,
              marginBottom: 22,
            }}>
              <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.75, fontWeight: 500, fontStyle: "italic", margin: 0 }}>
                {json.closing}
              </p>
            </div>

            {/* Aviso */}
            <p style={{ fontSize: 13, color: "#9575cd", lineHeight: 1.55, fontStyle: "italic", textAlign: "center" }}>
              {json.disclaimer}
            </p>
          </article>
        )}

        {/* Botões de ação */}
        {json && (
          <div className="no-print" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <button onClick={copyToClipboard} className="btn-gold btn-big" style={{ border: "none", cursor: "pointer", width: "100%" }}>
              {t("v2.delivery.save")}
            </button>

            <button
              onClick={printPage}
              className="btn-outline"
              style={{ background: "transparent", cursor: "pointer", width: "100%" }}
            >
              {t("v2.delivery.print")}
            </button>

            <Link
              href="/limpeza"
              className="btn-outline"
              style={{ display: "block", textAlign: "center", textDecoration: "none", width: "100%" }}
            >
              {t("v2.delivery.again")}
            </Link>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "linear-gradient(135deg, #25d366, #128c7e)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  padding: "18px 24px",
                  borderRadius: 16,
                  textDecoration: "none",
                  width: "100%",
                  boxShadow: "0 8px 22px rgba(37,211,102,0.3)",
                }}
              >
                {t("v2.delivery.whatsapp")}
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
