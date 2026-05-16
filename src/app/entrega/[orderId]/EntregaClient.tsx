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

/* ────────────────────────────────────────────────────────────────
 *  Inline SVG icons + decorativos (cyan + dourado)
 * ──────────────────────────────────────────────────────────────── */

const WaveDivider = ({ flip = false }: { flip?: boolean }) => (
  <div
    aria-hidden="true"
    style={{
      width: "100%",
      height: 36,
      margin: "26px 0",
      transform: flip ? "scaleY(-1)" : "none",
    }}
    className="no-print wave-anim"
  >
    <svg viewBox="0 0 1200 36" preserveAspectRatio="none" width="100%" height="100%">
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e8b84b" stopOpacity="0.0" />
          <stop offset="20%" stopColor="#e8b84b" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#7ee8f8" stopOpacity="0.85" />
          <stop offset="80%" stopColor="#e8b84b" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#e8b84b" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0,18 Q150,0 300,18 T600,18 T900,18 T1200,18"
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth="2.5"
      />
      <path
        d="M0,26 Q150,10 300,26 T600,26 T900,26 T1200,26"
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth="1.5"
        opacity="0.55"
      />
    </svg>
  </div>
);

const RippleRings = () => (
  <div
    aria-hidden="true"
    style={{
      position: "relative",
      width: 90,
      height: 90,
      margin: "10px auto 4px",
    }}
    className="no-print"
  >
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          position: "absolute",
          inset: 0,
          margin: "auto",
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "2px solid #7ee8f8",
          animation: `ripple 2.8s cubic-bezier(0.2,0.6,0.4,1) ${i * 0.8}s infinite`,
        }}
      />
    ))}
    <span
      style={{
        position: "absolute",
        inset: 0,
        margin: "auto",
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: "radial-gradient(circle, #e8b84b 0%, rgba(232,184,75,0) 70%)",
      }}
    />
  </div>
);

const DropIcon = ({ size = 24, color = "#7ee8f8" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2.5 C12 2.5 5 10 5 15.5 a7 7 0 0 0 14 0 C19 10 12 2.5 12 2.5z"
      fill={color}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M9 14.5 C9 16.5 10 18 12 18"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

const ShieldIcon = ({ size = 24, color = "#e8b84b" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2.5 L20 5.5 V12 C20 16.5 16.5 20 12 21.5 C7.5 20 4 16.5 4 12 V5.5 L12 2.5z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 12 L11 14.5 L15.5 9.5"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BoltIcon = ({ size = 24, color = "#e8b84b" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M13 2 L4 14 H11 L10 22 L20 9 H13 L13 2z"
      fill={color}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const StarIcon = ({ size = 24, color = "#e8b84b" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2.5 L14.5 9 L21.5 9.5 L16 14 L17.7 21 L12 17 L6.3 21 L8 14 L2.5 9.5 L9.5 9 L12 2.5z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
  </svg>
);

const SaveIcon = ({ size = 20, color = "#120025" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 4 H17 L20 7 V20 H5 V4z"
      fill={color}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <rect x="8" y="4" width="8" height="5" fill={color} />
    <rect x="8" y="13" width="9" height="6" stroke={color} strokeWidth="1.6" fill="none" />
  </svg>
);

const PrintIcon = ({ size = 20, color = "#e8b84b" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 8 V3 H17 V8" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    <rect x="4" y="8" width="16" height="9" rx="2" stroke={color} strokeWidth="1.8" />
    <rect x="7" y="13" width="10" height="7" stroke={color} strokeWidth="1.8" fill="none" />
  </svg>
);

const WavesIcon = ({ size = 20, color = "#7ee8f8" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2 9 Q6 5 10 9 T18 9 T22 9"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M2 15 Q6 11 10 15 T18 15 T22 15"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/* ────────────────────────────────────────────────────────────────
 *  Main Component
 * ──────────────────────────────────────────────────────────────── */

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
          pollTimer = setTimeout(ensureGenerated, 5000);
        } else if (res.status === 502) {
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
    <main
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #2a0f5e 0%, #1a0640 35%, #120025 70%)",
        color: "#fbf8ff",
        minHeight: "100vh",
        padding: "32px 16px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes wave { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes ripple { 0% { transform: scale(0.9); opacity: 0.6 } 100% { transform: scale(2.6); opacity: 0 } }
        @keyframes lightFlow { 0% { background-position: 0% -200% } 100% { background-position: 0% 200% } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes gentlePulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.04); opacity: 0.92 } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes typingBounce { 0%,80%,100% { transform: translateY(0); opacity: 0.5 } 40% { transform: translateY(-10px); opacity: 1 } }

        .typing-dot {
          display: inline-block;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #e8b84b;
          animation: typingBounce 1.4s ease-in-out infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        .wave-anim svg path { animation: wave 4s ease-in-out infinite; }
        .wave-anim svg path:nth-child(2) { animation-delay: 0.8s; }
        .fade-in { animation: fadeInUp 0.7s ease-out both; }
        .float-anim { animation: float 3.4s ease-in-out infinite; }

        .light-beam {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg,
            rgba(232,184,75,0) 0%,
            rgba(232,184,75,0.08) 30%,
            rgba(126,232,248,0.05) 50%,
            rgba(232,184,75,0.08) 70%,
            rgba(232,184,75,0) 100%);
          background-size: 100% 400%;
          animation: lightFlow 12s ease-in-out infinite alternate;
        }

        .section-img-frame {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          margin: 8px auto 16px;
          max-width: 540px;
          box-shadow: 0 14px 38px rgba(95,179,227,0.22), 0 0 0 2px rgba(232,184,75,0.35), 0 0 0 6px rgba(126,232,248,0.08);
        }

        .section-h3 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          color: #e8b84b;
          margin-bottom: 14px;
          font-weight: 700;
        }

        .closing-card {
          padding: 26px 22px;
          background: linear-gradient(135deg, rgba(232,184,75,0.22) 0%, rgba(126,232,248,0.12) 50%, rgba(232,184,75,0.22) 100%);
          background-size: 200% 200%;
          animation: shimmer 9s ease-in-out infinite;
          border: 2px solid rgba(232,184,75,0.45);
          border-radius: 18px;
          margin-bottom: 22px;
          text-align: center;
          position: relative;
        }

        .btn-svg-row {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .card, .card-gold, .closing-card { border: 1px solid #ccc !important; background: white !important; color: black !important; animation: none !important; }
          .section-h3 { color: #444 !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .typing-dot, .wave-anim svg path, .float-anim, .closing-card, .light-beam, .fade-in { animation: none !important; }
        }
        :focus-visible { outline: 4px solid #f5c860 !important; outline-offset: 2px; }
      `}</style>

      <div className="light-beam" aria-hidden="true" />

      <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
        {/* ─────────── HEADER SAGRADO ─────────── */}
        <div className="fade-in" style={{ textAlign: "center", marginBottom: 12 }}>
          <div
            className="no-print"
            style={{
              position: "relative",
              borderRadius: 26,
              overflow: "hidden",
              marginBottom: 18,
              maxWidth: 580,
              margin: "0 auto 18px",
              boxShadow:
                "0 22px 60px rgba(232,184,75,0.32), 0 0 0 3px rgba(232,184,75,0.5), 0 0 0 9px rgba(126,232,248,0.12)",
            }}
          >
            <Image
              src="/img/limpeza-altar.png"
              alt="Altar"
              width={1536}
              height={1024}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            {/* Glow inferior cyan */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: "40%",
                background:
                  "linear-gradient(to top, rgba(95,179,227,0.35) 0%, rgba(95,179,227,0) 100%)",
                pointerEvents: "none",
              }}
            />
          </div>

          <WaveDivider />

          <h1
            className="serif"
            style={{
              fontSize: "clamp(2rem, 5.5vw, 2.8rem)",
              color: "#e8b84b",
              lineHeight: 1.1,
              marginBottom: 14,
              fontWeight: 700,
              textShadow: "0 0 32px rgba(232,184,75,0.35)",
            }}
          >
            {t("v2.delivery.title").replace("{name}", firstName)}
          </h1>
          <p
            style={{
              fontSize: 21,
              color: "#c4b5fd",
              lineHeight: 1.55,
              fontStyle: "italic",
              marginBottom: 6,
            }}
          >
            {t("v2.delivery.blessing")}
          </p>

          <RippleRings />
        </div>

        {/* ─────────── AGUARDANDO ─────────── */}
        {!json && (
          <div className="card fade-in" style={{ padding: "36px 24px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", gap: 10, marginBottom: 18 }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <p style={{ fontSize: 21, color: "#fbf8ff", lineHeight: 1.65, fontWeight: 600 }}>
              {t("v2.delivery.preparing")}
            </p>
            <p style={{ fontSize: 18, color: "#c4b5fd", marginTop: 14, lineHeight: 1.6 }}>
              {t("v2.delivery.preparing_hint")}
            </p>
            <p style={{ fontSize: 16, color: "#9575cd", marginTop: 18, lineHeight: 1.6 }}>
              Vai chegar em até 5 minutos. Pode aguardar com calma.
            </p>
          </div>
        )}

        {/* ─────────── CONTEÚDO COMPLETO ─────────── */}
        {json && (
          <article
            className="card fade-in"
            style={{
              padding: "36px 26px",
              marginBottom: 22,
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(126,232,248,0.07) 0%, rgba(26,6,64,0.95) 60%)",
              border: "1.5px solid rgba(232,184,75,0.28)",
              borderRadius: 22,
              boxShadow: "0 18px 54px rgba(0,0,0,0.4), inset 0 1px 0 rgba(232,184,75,0.18)",
            }}
          >
            {/* Título dentro do card */}
            <h2
              className="serif"
              style={{
                fontSize: "clamp(1.8rem, 4.3vw, 2.3rem)",
                color: "#e8b84b",
                textAlign: "center",
                lineHeight: 1.15,
                marginBottom: 22,
                fontWeight: 700,
                padding: "18px 16px",
                background:
                  "linear-gradient(135deg, rgba(232,184,75,0.14) 0%, rgba(126,232,248,0.08) 100%)",
                borderRadius: 16,
                border: "1.5px solid rgba(232,184,75,0.38)",
              }}
            >
              {json.title}
            </h2>

            {/* Abertura */}
            <p
              style={{
                fontSize: 20,
                color: "#fbf8ff",
                lineHeight: 1.75,
                marginBottom: 12,
                fontWeight: 500,
              }}
            >
              {json.opening}
            </p>

            <WaveDivider />

            {/* Leitura espiritual */}
            <h3 className="serif section-h3">
              <BoltIcon size={26} />
              <span>{t("v2.delivery.reading")}</span>
            </h3>

            <div className="section-img-frame no-print">
              <Image
                src="/img/carta-caminhos.png"
                alt="Carta dos caminhos"
                width={1024}
                height={768}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            <p
              style={{
                fontSize: 20,
                color: "#fbf8ff",
                lineHeight: 1.75,
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              {json.spiritual_reading}
            </p>

            <WaveDivider flip />

            {/* Limpeza */}
            <h3 className="serif section-h3">
              <DropIcon size={26} />
              <span>{t("v2.delivery.cleansing")}</span>
            </h3>

            <div className="section-img-frame no-print">
              <Image
                src="/img/carta-limpeza.png"
                alt="Carta da limpeza"
                width={1024}
                height={768}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            <p
              style={{
                fontSize: 20,
                color: "#fbf8ff",
                lineHeight: 1.75,
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              {json.cleansing_message}
            </p>

            <WaveDivider />

            {/* Proteção */}
            <h3 className="serif section-h3">
              <ShieldIcon size={26} />
              <span>{t("v2.delivery.protection")}</span>
            </h3>

            <div className="section-img-frame no-print">
              <Image
                src="/img/carta-protecao.png"
                alt="Carta da proteção"
                width={1024}
                height={768}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            <p
              style={{
                fontSize: 20,
                color: "#fbf8ff",
                lineHeight: 1.75,
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              {json.protection_message}
            </p>

            <WaveDivider flip />

            {/* Próximos passos */}
            <h3 className="serif section-h3">
              <StarIcon size={26} />
              <span>{t("v2.delivery.steps")}</span>
            </h3>

            <ol
              style={{
                paddingLeft: 0,
                listStyle: "none",
                marginBottom: 24,
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(126,232,248,0.06) 0%, rgba(126,232,248,0) 70%)",
                borderRadius: 14,
                padding: 6,
              }}
            >
              {json.next_steps.map((step, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    padding: "14px 16px",
                    background: "rgba(232,184,75,0.06)",
                    border: "1px solid rgba(232,184,75,0.25)",
                    borderRadius: 13,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #e8b84b 0%, #c9950a 100%)",
                      color: "#120025",
                      fontSize: 19,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        "0 4px 12px rgba(232,184,75,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 20,
                      color: "#fbf8ff",
                      lineHeight: 1.6,
                      fontWeight: 500,
                    }}
                  >
                    {step}
                  </span>
                  <span style={{ flexShrink: 0, opacity: 0.8 }} aria-hidden="true">
                    <DropIcon size={20} color="#7ee8f8" />
                  </span>
                </li>
              ))}
            </ol>

            {/* Fechamento — animado */}
            <div className="closing-card float-anim">
              <div
                aria-hidden="true"
                style={{ fontSize: 38, lineHeight: 1, marginBottom: 10 }}
              >
                🌊
              </div>
              <p
                style={{
                  fontSize: 21,
                  color: "#fbf8ff",
                  lineHeight: 1.7,
                  fontWeight: 600,
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                {json.closing}
              </p>
            </div>

            {/* Aviso */}
            <small
              style={{
                display: "block",
                fontSize: 14,
                color: "#9575cd",
                lineHeight: 1.55,
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              {json.disclaimer}
            </small>
          </article>
        )}

        {/* ─────────── BOTÕES ─────────── */}
        {json && (
          <div className="no-print" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <button
              onClick={copyToClipboard}
              className="btn-gold btn-big"
              style={{ border: "none", cursor: "pointer", width: "100%" }}
            >
              <span className="btn-svg-row">
                <SaveIcon size={22} color="#120025" />
                <span>{t("v2.delivery.save")}</span>
              </span>
            </button>

            <button
              onClick={printPage}
              className="btn-outline"
              style={{ background: "transparent", cursor: "pointer", width: "100%" }}
            >
              <span className="btn-svg-row">
                <PrintIcon size={22} color="#e8b84b" />
                <span>{t("v2.delivery.print")}</span>
              </span>
            </button>

            <Link
              href="/limpeza"
              className="btn-outline"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                width: "100%",
              }}
            >
              <span className="btn-svg-row">
                <WavesIcon size={22} color="#7ee8f8" />
                <span>{t("v2.delivery.again")}</span>
              </span>
            </Link>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  background:
                    "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  padding: "20px 24px",
                  borderRadius: 18,
                  textDecoration: "none",
                  width: "100%",
                  boxShadow:
                    "0 10px 26px rgba(37,211,102,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
                  minHeight: 64,
                }}
              >
                <span className="btn-svg-row">
                  <WhatsAppIcon size={24} />
                  <span>{t("v2.delivery.whatsapp")}</span>
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
