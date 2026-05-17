import Image from "next/image";
import { LimpezaForm } from "./LimpezaForm";
import { getServerT } from "@/lib/i18n/server";

// Metadata é estática (Next exige). Usa PT por default; SEO em outros idiomas
// pode ser adicionado depois via generateMetadata se necessário.
export const metadata = {
  title: "Limpeza Espiritual personalizada da ATB",
  description:
    "Receba sua Limpeza Espiritual personalizada da ATB. Escreva seu nome e o que está sentindo. A ATB prepara uma orientação espiritual simples, acolhedora e personalizada para você.",
};

export default function LimpezaV2Page() {
  const { t } = getServerT();

  const proofs = [
    { icon: "📱", text: t("v2.proof.mobile") },
    { icon: "💳", text: t("v2.proof.payment") },
    { icon: "⚡", text: t("v2.proof.delivery") },
    { icon: "🕊️", text: t("v2.proof.content") },
    { icon: "❤️", text: t("v2.proof.audience") },
  ];

  const whoFor = [
    t("v2.who.1"),
    t("v2.who.2"),
    t("v2.who.3"),
    t("v2.who.4"),
    t("v2.who.5"),
    t("v2.who.6"),
    t("v2.who.7"),
  ];

  const howItWorks = [
    t("v2.how.1"),
    t("v2.how.2"),
    t("v2.how.3"),
  ];

  return (
    <main style={{ background: "#120025", color: "#fbf8ff", minHeight: "100vh" }}>
      {/* HERO */}
      <section style={{
        background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)",
        padding: "40px 20px 32px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Imagem do altar (asset fixo) */}
          <div style={{
            borderRadius: 22,
            overflow: "hidden",
            marginBottom: 24,
            boxShadow: "0 18px 50px rgba(232,184,75,0.3), 0 0 0 3px rgba(232,184,75,0.5)",
          }}>
            <Image
              src="/img/limpeza-altar.png"
              alt="ATB"
              width={1536}
              height={1024}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          <div style={{
            fontSize: 14,
            color: "#f5c860",
            fontWeight: 700,
            letterSpacing: "0.12em",
            marginBottom: 12,
            textTransform: "uppercase",
          }}>
            {t("v2.hero.badge")}
          </div>

          <h1 className="serif" style={{
            fontSize: "clamp(2rem, 6vw, 3rem)",
            color: "#e8b84b",
            lineHeight: 1.1,
            marginBottom: 18,
            fontWeight: 700,
          }}>
            {t("v2.hero.title")}
          </h1>

          <p style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.25rem)",
            color: "#fbf8ff",
            lineHeight: 1.6,
            marginBottom: 28,
            maxWidth: 560,
            margin: "0 auto 28px",
            fontWeight: 500,
          }}>
            {t("v2.hero.desc")}
          </p>

          <a
            href="#formulario"
            className="btn-gold btn-big"
            style={{
              display: "inline-block",
              textDecoration: "none",
              padding: "20px 36px",
              fontSize: "1.2rem",
              fontWeight: 800,
              border: "none",
            }}
          >
            {t("v2.hero.cta")}
          </a>

          {/* Provas de confiança */}
          <div style={{
            marginTop: 36,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            maxWidth: 720,
            margin: "36px auto 0",
            textAlign: "left",
          }}>
            {proofs.map((p, i) => (
              <div key={i} style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "14px 16px",
                background: "rgba(232,184,75,0.08)",
                border: "1px solid rgba(232,184,75,0.25)",
                borderRadius: 12,
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }} aria-hidden="true">{p.icon}</span>
                <span style={{ fontSize: 20, color: "#fbf8ff", lineHeight: 1.5, fontWeight: 500 }}>
                  {p.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA QUEM É */}
      <section style={{ padding: "44px 20px", maxWidth: 760, margin: "0 auto" }}>
        <h2 className="serif" style={{
          fontSize: "clamp(1.6rem, 4vw, 2rem)",
          color: "#e8b84b",
          textAlign: "center",
          marginBottom: 24,
          fontWeight: 700,
        }}>
          {t("v2.who.title")}
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {whoFor.map((text, i) => (
            <li key={i} style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              padding: "16px 20px",
              background: "rgba(232,184,75,0.06)",
              border: "1px solid rgba(232,184,75,0.2)",
              borderRadius: 14,
              fontSize: 20,
              color: "#fbf8ff",
              fontWeight: 500,
              lineHeight: 1.5,
            }}>
              <span style={{ fontSize: 24, flexShrink: 0 }} aria-hidden="true">✦</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{
        padding: "44px 20px",
        background: "radial-gradient(ellipse at 50% 50%, #2a0055, #120025 75%)",
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2 className="serif" style={{
            fontSize: "clamp(1.6rem, 4vw, 2rem)",
            color: "#e8b84b",
            textAlign: "center",
            marginBottom: 28,
            fontWeight: 700,
          }}>
            {t("v2.how.title")}
          </h2>
          <ol style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            counterReset: "step",
          }}>
            {howItWorks.map((text, i) => (
              <li key={i} style={{
                background: "linear-gradient(135deg, #2a0055, #1e0040)",
                padding: "24px 20px",
                borderRadius: 18,
                border: "1.5px solid rgba(232,184,75,0.3)",
                textAlign: "center",
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #e8b84b, #c9950a)",
                  color: "#120025",
                  fontSize: 28,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 20, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* COMO VOCÊ VAI RECEBER (UX 60+) */}
      <section style={{ padding: "44px 20px", maxWidth: 760, margin: "0 auto" }}>
        <h2 className="serif" style={{
          fontSize: "clamp(1.6rem, 4vw, 2rem)",
          color: "#e8b84b",
          textAlign: "center",
          marginBottom: 24,
          fontWeight: 700,
        }}>
          {t("v2.receive.title")}
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}>
          {[
            { h: t("v2.receive.email_h"), d: t("v2.receive.email_d") },
            { h: t("v2.receive.whatsapp_h"), d: t("v2.receive.whatsapp_d") },
            { h: t("v2.receive.site_h"), d: t("v2.receive.site_d") },
          ].map((card, i) => (
            <div key={i} style={{
              padding: "20px 18px",
              background: "linear-gradient(135deg, rgba(232,184,75,0.10), rgba(126,232,248,0.06))",
              border: "1.5px solid rgba(232,184,75,0.35)",
              borderRadius: 16,
            }}>
              <div className="serif" style={{
                fontSize: "1.25rem",
                color: "#f5c860",
                fontWeight: 700,
                marginBottom: 8,
                lineHeight: 1.25,
              }}>
                {card.h}
              </div>
              <div style={{
                fontSize: 20,
                color: "#fbf8ff",
                lineHeight: 1.55,
                fontWeight: 500,
              }}>
                {card.d}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section id="formulario" style={{ padding: "44px 20px 80px", maxWidth: 640, margin: "0 auto" }}>
        <h2 className="serif" style={{
          fontSize: "clamp(1.7rem, 4vw, 2.2rem)",
          color: "#e8b84b",
          textAlign: "center",
          marginBottom: 16,
          fontWeight: 700,
        }}>
          {t("v2.form.title")}
        </h2>
        <p style={{
          fontSize: 20,
          color: "#c4b5fd",
          textAlign: "center",
          marginBottom: 28,
          lineHeight: 1.55,
        }}>
          {t("v2.form.intro")}
        </p>
        <LimpezaForm />
      </section>

      {/* RODAPÉ */}
      <footer style={{
        padding: "24px 20px",
        borderTop: "1px solid rgba(196,181,253,0.18)",
        textAlign: "center",
        color: "#9575cd",
        fontSize: 14,
        lineHeight: 1.6,
      }}>
        © {new Date().getFullYear()} ATB · {t("v2.footer.disclaimer")}
      </footer>
    </main>
  );
}
