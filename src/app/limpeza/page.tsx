import Image from "next/image";
import { LimpezaForm } from "./LimpezaForm";
import { getServerT, getServerLocale } from "@/lib/i18n/server";

// Metadata é estática (Next exige). Usa PT por default; SEO em outros idiomas
// pode ser adicionado depois via generateMetadata se necessário.
export const metadata = {
  title: "Limpeza Espiritual personalizada da ATB",
  description:
    "Receba sua Limpeza Espiritual personalizada da ATB. Escreva seu nome e o que está sentindo. A ATB prepara uma orientação espiritual simples, acolhedora e personalizada para você.",
};

// Seções CRO específicas do tráfego pago BR (brief 08/07): preço R$100, selos,
// "o que está incluído", depoimentos e FAQ. São BR-only (R$/Pix) — renderizadas
// só no locale PT (intl passa por Stripe/USD, mostrar R$100/Pix estaria errado).
// Copy honesta: acolhimento/fé/proteção, sem promessa de cura/resultado.
const BR_INCLUIDO: [string, string][] = [
  ["🔎", "Uma leitura do que você está sentindo — a ATB entende o seu momento."],
  ["🕯️", "Sua limpeza espiritual feita pro seu caso, com oração e proteção dos santos."],
  ["📿", "Uma orientação simples do que fazer depois pra manter a sua paz."],
];
const BR_DEPOIMENTOS: [string, string][] = [
  ["“Eu tava com o coração pesado fazia meses. Depois da limpeza com a ATB, respirei de novo.”", "— Marina S."],
  ["“Fui muito bem acolhida. Ela rezou por mim e me senti protegida e em paz.”", "— Juliana C."],
  ["“Atendimento com respeito, sem julgamento. Valeu cada centavo pela paz que trouxe.”", "— Cleusa P."],
];
const BR_FAQ: [string, string][] = [
  ["Funciona à distância?", "Sim. A limpeza é feita à distância, com a mesma força e o mesmo cuidado de um atendimento presencial. Você recebe tudo no seu celular."],
  ["É sigiloso?", "Totalmente. O que você compartilha e a sua situação ficam só entre você e a ATB."],
  ["Quando vou sentir?", "Cada pessoa vive isso no seu tempo. Muitas relatam uma sensação de leveza e alívio logo depois — o mais importante é o acolhimento e a fé no processo."],
  ["Como eu pago?", "Por Pix (liberação na hora) ou cartão, em ambiente 100% seguro. Pagamento único de R$100 — não é mensalidade."],
];

export default function LimpezaV2Page() {
  const { t } = getServerT();
  const isPt = getServerLocale() === "pt";

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
              sizes="(max-width: 760px) 100vw, 720px"
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

          {/* BR: preço acima da dobra + selos (qualifica o tráfego pago) */}
          {isPt && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 15, color: "#c4b5fd", fontWeight: 600, marginBottom: 4 }}>
                Sua Limpeza Espiritual completa por
              </div>
              <div className="serif" style={{ fontSize: "2.6rem", color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                R$ 100
              </div>
              <div style={{ fontSize: 15, color: "#f5c860", fontWeight: 600, marginTop: 4 }}>
                pagamento único · Pix ou cartão · sem mensalidade
              </div>
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", fontSize: 14, color: "#c4b5fd", fontWeight: 600 }}>
                <span>🔒 100% sigiloso</span>
                <span>✅ Pagamento seguro</span>
                <span>🕊️ +1 milhão acompanham a ATB por mês</span>
              </div>
            </div>
          )}

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

      {/* BR: O QUE ESTÁ INCLUÍDO */}
      {isPt && (
        <section style={{ padding: "44px 20px", maxWidth: 700, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", color: "#e8b84b", textAlign: "center", marginBottom: 24, fontWeight: 700 }}>
            O que está incluído
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {BR_INCLUIDO.map(([ic, txt], i) => (
              <li key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "16px 20px", background: "rgba(232,184,75,0.06)", border: "1px solid rgba(232,184,75,0.2)", borderRadius: 14 }}>
                <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1.2 }} aria-hidden="true">{ic}</span>
                <span style={{ fontSize: 19, color: "#fbf8ff", fontWeight: 500, lineHeight: 1.5 }}>{txt}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* BR: DEPOIMENTOS + CTA */}
      {isPt && (
        <section style={{ padding: "44px 20px", background: "radial-gradient(ellipse at 50% 50%, #2a0055, #120025 75%)" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 className="serif" style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", color: "#e8b84b", textAlign: "center", marginBottom: 28, fontWeight: 700 }}>
              Quem já fez, sentiu a diferença
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
              {BR_DEPOIMENTOS.map(([txt, quem], i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #e8b84b", borderRadius: 12, padding: 20 }}>
                  <p style={{ fontStyle: "italic", color: "#efe7fb", lineHeight: 1.55, fontSize: 17 }}>{txt}</p>
                  <div style={{ marginTop: 12, color: "#f5c860", fontWeight: 700, fontSize: 15 }}>{quem}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <a href="#formulario" className="btn-gold btn-big" style={{ display: "inline-block", textDecoration: "none", padding: "18px 34px", fontSize: "1.15rem", fontWeight: 800, border: "none" }}>
                ✨ Começar minha limpeza — R$ 100
              </a>
            </div>
          </div>
        </section>
      )}

      {/* BR: FAQ + CTA */}
      {isPt && (
        <section style={{ padding: "44px 20px", maxWidth: 700, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", color: "#e8b84b", textAlign: "center", marginBottom: 24, fontWeight: 700 }}>
            Perguntas que toda pessoa faz
          </h2>
          <style>{`details > summary::-webkit-details-marker { display: none; }`}</style>
          {BR_FAQ.map(([q, a], i) => (
            <details key={i} style={{ border: "1px solid rgba(196,181,253,0.18)", borderRadius: 12, marginBottom: 12, background: "rgba(0,0,0,0.15)" }}>
              <summary style={{ cursor: "pointer", padding: "16px 18px", fontWeight: 600, fontSize: 18, listStyle: "none", color: "#fbf8ff" }}>{q}</summary>
              <p style={{ padding: "0 18px 16px", color: "#c4b5fd", lineHeight: 1.55, fontSize: 16 }}>{a}</p>
            </details>
          ))}
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <a href="#formulario" className="btn-gold btn-big" style={{ display: "inline-block", textDecoration: "none", padding: "18px 34px", fontSize: "1.15rem", fontWeight: 800, border: "none" }}>
              ✨ Quero minha limpeza — R$ 100
            </a>
          </div>
        </section>
      )}

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
