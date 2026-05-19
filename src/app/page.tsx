"use client";
import Link from "next/link";
import Image from "next/image";
import { useT } from "@/lib/i18n/I18nProvider";
import { LangSwitcher } from "@/components/LangSwitcher";

const S = {
  bg:      "#120025",
  surface: "#1e0040",
  surface2:"#2a0055",
  gold:    "#e8b84b",
  text:    "#f5f0ff",
  text2:   "#c4b5fd",
  muted:   "#9575cd",
  sep:     "rgba(196,181,253,0.18)",
};

export default function Home() {
  const { t } = useT();
  // Os botões Basic/Premium/Limpeza agora vão pelo roteador /api/checkout/[plan]
  // (decide Kiwify BR vs Stripe intl server-side por IP).

  const features = [
    { icon: "💬", title: t("features.chat.title"), desc: t("features.chat.desc") },
    { icon: "🔮", title: t("features.oracle.title"), desc: t("features.oracle.desc") },
    { icon: "📖", title: t("features.journal.title"), desc: t("features.journal.desc") },
    { icon: "🕯️", title: t("features.addiction.title"), desc: t("features.addiction.desc") },
  ];

  const testimonials = [
    { name: t("testi.1.name"), text: t("testi.1.text") },
    { name: t("testi.2.name"), text: t("testi.2.text") },
    { name: t("testi.3.name"), text: t("testi.3.text") },
  ];

  return (
    <main style={{ background: S.bg, color: S.text, minHeight: "100vh" }}>

      {/* Header */}
      <header style={{ background: "rgba(30,0,64,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${S.sep}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="serif text-2xl" style={{ color: S.gold }}>{t("brand")}</span>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <LangSwitcher compact />
            <Link href="/login" style={{ color: S.text2, fontWeight: 700, fontSize: 18, textDecoration: "none", padding: "10px 14px", minHeight: 44 }}>{t("nav.signin")}</Link>
            <Link href="/cadastro" className="btn-gold" style={{ padding: "14px 26px", fontSize: 17, fontWeight: 800, minHeight: 48 }}>{t("nav.signup")}</Link>
          </div>
        </div>
      </header>

      {/* HERO — produto principal: Chat com ATB */}
      <section style={{ padding: "70px 24px 80px", background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 65%)", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 40, alignItems: "center" }}>

          {/* Texto à esquerda */}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 18, color: S.gold, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>
              {t("landing.hero_badge")}
            </div>
            <h1 className="serif" style={{ fontSize: "clamp(2.6rem,6vw,4.6rem)", color: S.text, lineHeight: 1.1, marginBottom: 24, fontWeight: 700 }}>
              {t("hero.title_1")}<br/>
              <span style={{ color: S.gold }}>{t("hero.title_2")}</span>
            </h1>
            <p style={{ fontSize: "1.4rem", color: S.text, maxWidth: 560, marginBottom: 36, lineHeight: 1.6, fontWeight: 500 }}>
              {t("hero.desc")}
            </p>
            <a
              href="#pergunta"
              className="btn-gold btn-big"
              style={{
                fontSize: "1.3rem",
                padding: "22px 38px",
                textDecoration: "none",
                fontWeight: 800,
                display: "inline-block",
                minHeight: 70,
              }}
            >
              {t("hero.cta_pergunta")}
            </a>
            <p style={{ fontSize: 15, color: "#c4b5fd", marginTop: 14, fontWeight: 500 }}>
              {t("hero.cta_pergunta_sub")}
            </p>
          </div>

          {/* Imagem à direita — ATB acolhedora */}
          <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(232,184,75,0.3), 0 0 0 3px rgba(232,184,75,0.4)" }}>
            <Image
              src="/img/landing-hero.png"
              alt={t("landing.hero_alt")}
              width={768}
              height={512}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, transparent 60%, rgba(18,0,37,0.5) 100%)",
              pointerEvents: "none",
            }} />
          </div>
        </div>
      </section>

      {/* PRODUTO 1 — Chat com ATB (destaque) */}
      <section id="chat" style={{ padding: "70px 24px", background: "radial-gradient(ellipse at 50% 50%, #1e0040 0%, #120025 75%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 18, color: S.gold, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              <span aria-hidden="true">✨</span> {t("features.chat.title")} <span aria-hidden="true">✨</span>
            </div>
            <h2 className="serif" style={{ fontSize: "clamp(2rem,5vw,3rem)", color: S.gold, lineHeight: 1.15, marginBottom: 16, fontWeight: 700 }}>
              {t("features.chat.title")}
            </h2>
            <p style={{ fontSize: "1.3rem", color: S.text, maxWidth: 620, margin: "0 auto", lineHeight: 1.6, fontWeight: 500 }}>
              {t("features.chat.desc")}
            </p>
          </div>

          {/* O que entrega — 4 bullets grandes */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 18,
            maxWidth: 900,
            margin: "0 auto 40px",
          }}>
            {features.map((f) => (
              <div key={f.title} className="card" style={{ padding: "26px 22px", textAlign: "center", border: "1.5px solid rgba(232,184,75,0.25)" }}>
                <div style={{ fontSize: 52, marginBottom: 14 }} aria-hidden="true">{f.icon}</div>
                <h3 className="serif" style={{ fontSize: "1.4rem", color: S.gold, marginBottom: 10, fontWeight: 700 }}>{f.title}</h3>
                <p style={{ color: S.text, fontSize: 19, lineHeight: 1.6, fontWeight: 500 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funil de entrada: Pergunta avulsa (R$14,90/R$19,90/R$39,90) */}
      <section id="pergunta" style={{ padding: "70px 24px", background: "radial-gradient(ellipse at 50% 0%, #1e0040 0%, #120025 70%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 16,
            color: S.gold,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textAlign: "center",
            textTransform: "uppercase",
            marginBottom: 14,
          }}>
            {t("landing.pergunta_eyebrow")}
          </div>
          <h2 className="serif" style={{ fontSize: "clamp(2rem,5vw,3rem)", color: S.gold, textAlign: "center", marginBottom: 14, fontWeight: 700 }}>
            {t("landing.pergunta_title")}
          </h2>
          <p style={{ fontSize: 22, color: S.text, textAlign: "center", marginBottom: 40, lineHeight: 1.55, maxWidth: 640, margin: "0 auto 40px", fontWeight: 500 }}>
            {t("landing.pergunta_subtitle")}
          </p>

          {/* 3 cards lado a lado */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 22,
            marginBottom: 28,
          }}>
            {[
              { plan: "pergunta1", h: t("landing.pergunta_card_1_h"), price: t("landing.pergunta_card_1_price"), badge: null, highlight: false },
              { plan: "pergunta3", h: t("landing.pergunta_card_3_h"), price: t("landing.pergunta_card_3_price"), badge: t("landing.pergunta_card_3_badge"), highlight: false },
              { plan: "pergunta7", h: t("landing.pergunta_card_7_h"), price: t("landing.pergunta_card_7_price"), badge: t("landing.pergunta_card_7_badge"), highlight: true },
            ].map((card) => (
              <div
                key={card.plan}
                style={{
                  position: "relative",
                  padding: "32px 24px 28px",
                  background: card.highlight
                    ? "linear-gradient(135deg, rgba(232,184,75,0.18) 0%, rgba(126,232,248,0.10) 100%)"
                    : "linear-gradient(135deg, #1e0040 0%, #2a0055 100%)",
                  border: card.highlight ? "2.5px solid #e8b84b" : "1.5px solid rgba(232,184,75,0.35)",
                  borderRadius: 20,
                  boxShadow: card.highlight ? "0 18px 44px rgba(232,184,75,0.25)" : "0 8px 24px rgba(0,0,0,0.3)",
                  textAlign: "center",
                }}
              >
                {card.badge && (
                  <div style={{
                    position: "absolute",
                    top: -14,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: card.highlight ? "linear-gradient(135deg, #e8b84b, #c9950a)" : "linear-gradient(135deg, #7ee8f8, #5fb3e3)",
                    color: "#120025",
                    fontSize: 15,
                    fontWeight: 800,
                    padding: "6px 14px",
                    borderRadius: 999,
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}>
                    {card.badge}
                  </div>
                )}
                <div className="serif" style={{ fontSize: "1.6rem", color: S.gold, fontWeight: 700, marginBottom: 14, lineHeight: 1.2 }}>
                  {card.h}
                </div>
                <div className="serif" style={{ fontSize: "2.8rem", color: S.text, fontWeight: 800, marginBottom: 22, lineHeight: 1 }}>
                  {card.price}
                </div>
                <a
                  href={`/api/checkout/${card.plan}`}
                  className="btn-gold btn-big"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "18px 24px",
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    textDecoration: "none",
                    border: "none",
                  }}
                >
                  {t("landing.pergunta_card_cta")}
                </a>
              </div>
            ))}
          </div>

          {/* Linha upsell pra Basic */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <a
              href="#planos"
              style={{
                display: "inline-block",
                fontSize: 20,
                color: S.text2,
                textDecoration: "none",
                fontWeight: 600,
                padding: "14px 22px",
                borderRadius: 12,
                background: "rgba(126,232,248,0.10)",
                border: "1.5px solid rgba(126,232,248,0.35)",
              }}
            >
              {t("landing.pergunta_upsell")} →
            </a>
          </div>

          <p style={{ fontSize: 18, color: S.muted, textAlign: "center", lineHeight: 1.5, fontWeight: 500, marginTop: 14 }}>
            {t("landing.pergunta_security")}
          </p>
        </div>
      </section>

      {/* Limpeza Espiritual — Produto único R$100 */}
      <section id="limpeza" style={{
        padding: "70px 24px",
        background: "radial-gradient(ellipse at 50% 50%, #2a0055 0%, #120025 75%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Estrelas decorativas SVG no fundo */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4, pointerEvents: "none" }} preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="starGlow">
              <stop offset="0%" stopColor="#e8b84b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e8b84b" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[
            [10, 15, 4], [85, 20, 3], [25, 75, 5], [70, 80, 4], [50, 10, 2],
            [15, 50, 3], [90, 60, 4], [40, 90, 3], [75, 40, 2], [5, 35, 3],
            [60, 65, 5], [35, 30, 2], [95, 85, 3],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="url(#starGlow)" />
          ))}
        </svg>
        <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            {/* Imagem real do altar sagrado */}
            <div style={{ marginBottom: 24, borderRadius: 24, overflow: "hidden", maxWidth: 720, margin: "0 auto 24px", boxShadow: "0 25px 70px rgba(232,184,75,0.3), 0 0 0 3px rgba(232,184,75,0.5)" }}>
              <Image
                src="/img/limpeza-altar.png"
                alt={t("landing.altar_alt")}
                width={1536}
                height={1024}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            <div style={{ fontSize: 18, color: "#f5c860", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              {t("landing.limpeza_eyebrow")}
            </div>
            <h2 className="serif" style={{ fontSize: "clamp(2.4rem,6vw,3.8rem)", color: S.gold, lineHeight: 1.1, marginBottom: 18 }}>
              {t("landing.limpeza_h2")}
            </h2>
            <p style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.4rem)", color: S.text, maxWidth: 620, margin: "0 auto", lineHeight: 1.65, fontWeight: 500 }}>
              {t("landing.limpeza_desc")}
            </p>
          </div>

          {/* 3 cartas espirituais com imagens reais */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 22,
            marginBottom: 44,
          }}>
            {[
              { img: "/img/carta-limpeza.png",  title: t("landing.card1_title"), saint: t("landing.card1_saint"), desc: t("landing.card1_desc") },
              { img: "/img/carta-caminhos.png", title: t("landing.card2_title"), saint: t("landing.card2_saint"), desc: t("landing.card2_desc") },
              { img: "/img/carta-protecao.png", title: t("landing.card3_title"), saint: t("landing.card3_saint"), desc: t("landing.card3_desc") },
            ].map((c) => (
              <div key={c.title} style={{
                background: "linear-gradient(135deg, #2a0055 0%, #1e0040 100%)",
                borderRadius: 22,
                overflow: "hidden",
                color: "#fbf8ff",
                boxShadow: "0 14px 36px rgba(0,0,0,0.5)",
                border: "3px solid rgba(232,184,75,0.4)",
                textAlign: "center",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}>
                {/* Imagem da carta */}
                <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden" }}>
                  <Image
                    src={c.img}
                    alt={c.title}
                    width={1024}
                    height={1024}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {/* Brilho sobre a imagem */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(180deg, transparent 50%, rgba(30,0,64,0.7) 100%)",
                    pointerEvents: "none",
                  }} />
                </div>
                {/* Texto abaixo */}
                <div style={{ padding: "22px 20px" }}>
                  <h3 className="serif" style={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.15, marginBottom: 6, color: S.gold }}>{c.title}</h3>
                  <div style={{ fontSize: 17, color: S.text2, fontStyle: "italic", marginBottom: 12, fontWeight: 500 }}><span aria-hidden="true">✦</span> {c.saint}</div>
                  <p style={{ fontSize: 19, lineHeight: 1.6, margin: 0, fontWeight: 500, color: S.text }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Lista de benefícios — fonte grande para 60+ */}
          <div className="card-gold" style={{ padding: "32px 28px", marginBottom: 36 }}>
            <h3 className="serif" style={{ fontSize: "1.6rem", color: S.gold, textAlign: "center", marginBottom: 24 }}>
              {t("landing.bullets_title")}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
              {[
                { icon: "🕯️", text: t("landing.bullet1") },
                { icon: "🗝️", text: t("landing.bullet2") },
                { icon: "👑", text: t("landing.bullet3") },
                { icon: "💧", text: t("landing.bullet4") },
                { icon: "⚔️", text: t("landing.bullet5") },
                { icon: "✨", text: t("landing.bullet6") },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "center", padding: "8px 0" }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }} aria-hidden="true">{b.icon}</span>
                  <span style={{ fontSize: 19, color: S.text, lineHeight: 1.5, fontWeight: 500 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Santos — imagem real ilustrada */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 18, color: S.gold, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20 }}>
              {t("landing.saints_title")}
            </div>
            <div style={{ borderRadius: 20, overflow: "hidden", maxWidth: 820, margin: "0 auto", boxShadow: "0 18px 48px rgba(0,0,0,0.45), 0 0 0 2px rgba(232,184,75,0.4)" }}>
              <Image
                src="/img/santos-grid.png"
                alt={t("landing.saints_alt")}
                width={1536}
                height={1024}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            {/* Nomes legíveis embaixo */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, marginTop: 18 }}>
              {[
                "N. S. Aparecida", "Sagrado Coração", "São Miguel",
                "Santo Antônio", "São Jorge", "N. S. Desatadora",
              ].map((name) => (
                <div key={name} style={{
                  fontSize: 17,
                  color: S.text2,
                  fontWeight: 600,
                  padding: "10px 16px",
                  background: "rgba(232,184,75,0.1)",
                  borderRadius: 999,
                  border: "1px solid rgba(232,184,75,0.3)",
                }}>
                  {name}
                </div>
              ))}
            </div>
          </div>

          {/* CTA Compra — botão GIGANTE para 60+ */}
          <div style={{
            background: "linear-gradient(135deg, #1e0040 0%, #4a1a7a 50%, #1e0040 100%)",
            border: "3px solid rgba(232,184,75,0.7)",
            borderRadius: 24,
            padding: "40px 28px",
            textAlign: "center",
            maxWidth: 600,
            margin: "0 auto",
            boxShadow: "0 16px 50px rgba(232,184,75,0.22)",
          }}>
            <div style={{ fontSize: 18, color: "#f5c860", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontWeight: 700 }}>
              {t("landing.payment_eyebrow")}
            </div>
            <div className="serif" style={{ fontSize: "clamp(3.4rem, 8vw, 4.5rem)", color: S.gold, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>
              R$ 100
            </div>
            <div style={{ fontSize: 19, color: "#fbf8ff", marginBottom: 28, fontWeight: 500 }}>
              {t("landing.payment_once")}
            </div>
            <a
              href="/api/checkout/limpeza"
              className="btn-gold"
              style={{
                display: "block",
                padding: "22px 24px",
                fontSize: "1.3rem",
                fontWeight: 800,
                textDecoration: "none",
                width: "100%",
                maxWidth: 480,
                margin: "0 auto",
                letterSpacing: "0.02em",
              }}
            >
              {t("landing.payment_cta")}
            </a>
            <div style={{ marginTop: 22, padding: "16px 20px", background: "rgba(232,184,75,0.08)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.2)" }}>
              <p style={{ fontSize: 18, color: "#fbf8ff", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                <span aria-hidden="true">🔒</span> <strong>{t("landing.trust_secure")}</strong><br />
                {t("landing.trust_methods")}<br />
                {t("landing.trust_delivery")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos do Chat — só pagos, dois cards grandes 60+ */}
      <section id="planos" style={{ padding: "70px 24px", background: "radial-gradient(ellipse at 50% 100%, #2a0055 0%, #120025 70%)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "clamp(2rem,5vw,3rem)", color: S.gold, textAlign: "center", marginBottom: 14, fontWeight: 700 }}>
            {t("plans.title")}
          </h2>
          <p style={{ fontSize: 21, color: S.text, textAlign: "center", marginBottom: 40, lineHeight: 1.55, maxWidth: 580, margin: "0 auto 40px", fontWeight: 500 }}>
            {t("checkout.recurringDisclaimer")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>

            <div className="card" style={{ padding: "36px 28px", display: "flex", flexDirection: "column", border: "2px solid rgba(232,184,75,0.4)" }}>
              <h3 className="serif" style={{ fontSize: "1.8rem", color: S.gold, marginBottom: 6, fontWeight: 700 }}>{t("checkout.title.fullAccess")}</h3>
              <div style={{ fontSize: "2.6rem", fontWeight: 800, color: S.text, marginBottom: 24, lineHeight: 1 }}>
                R$29 <span style={{ fontSize: 18, fontWeight: 400, color: S.text2 }}>{t("price.perMonth")}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1 }}>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 18, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.basic.f1")}</li>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 18, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.basic.f2")}</li>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 18, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.basic.f3")}</li>
                <li style={{ color: S.text2, fontSize: 18, lineHeight: 1.5 }}>{t("plans.basic.f4")}</li>
              </ul>
              <a href="/api/checkout/basic" className="btn-gold btn-big" style={{ textAlign: "center", display: "block", padding: "20px 24px", fontSize: "1.2rem", fontWeight: 800, textDecoration: "none", border: "none" }}>{t("checkout.cta.access")}</a>
            </div>

            <div className="card-gold" style={{ padding: "36px 28px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 13, fontWeight: 700, background: S.gold, color: "#120025", borderRadius: 999, padding: "5px 16px", display: "inline-block", marginBottom: 14, alignSelf: "flex-start", letterSpacing: "0.05em" }}>{t("plans.premium.badge")}</div>
              <h3 className="serif" style={{ fontSize: "1.8rem", color: S.gold, marginBottom: 6, fontWeight: 700 }}>{t("checkout.title.madameAriel")}</h3>
              <div style={{ fontSize: "2.6rem", fontWeight: 800, color: S.text, marginBottom: 24, lineHeight: 1 }}>
                R$250 <span style={{ fontSize: 18, fontWeight: 400, color: S.text2 }}>{t("price.perMonth")}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1 }}>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 18, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.premium.f1")}</li>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 18, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.premium.f2")}</li>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 18, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.premium.f3")}</li>
                <li style={{ color: S.text, fontSize: 18, lineHeight: 1.5 }}>{t("plans.premium.f4")}</li>
              </ul>
              <a href="/api/checkout/premium" className="btn-gold btn-big" style={{ textAlign: "center", display: "block", padding: "20px 24px", fontSize: "1.2rem", fontWeight: 800, textDecoration: "none", border: "none" }}>{t("checkout.cta.startReading")}</a>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section style={{ padding: "60px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 className="serif" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", color: S.gold, textAlign: "center", marginBottom: 36 }}>
          {t("testi.title")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {testimonials.map((tm) => (
            <div key={tm.name} className="card" style={{ padding: "28px 24px" }}>
              <p style={{ fontStyle: "italic", color: S.text, lineHeight: 1.7, marginBottom: 16, fontSize: 19, fontWeight: 500 }}>&ldquo;{tm.text}&rdquo;</p>
              <div style={{ fontWeight: 700, color: S.gold, fontSize: 17 }}>— {tm.name}</div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "32px 24px 40px", borderTop: `1px solid ${S.sep}`, color: S.text2, fontSize: 16, fontWeight: 500 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, marginBottom: 18 }}>
          <Link href="/privacidade" style={{ color: S.text2, textDecoration: "underline", fontSize: 17, fontWeight: 600, padding: "8px 4px", minHeight: 44 }}>
            {t("footer.privacy")}
          </Link>
          <Link href="/termos" style={{ color: S.text2, textDecoration: "underline", fontSize: 17, fontWeight: 600, padding: "8px 4px", minHeight: 44 }}>
            {t("footer.terms")}
          </Link>
          <Link href="/cookies" style={{ color: S.text2, textDecoration: "underline", fontSize: 17, fontWeight: 600, padding: "8px 4px", minHeight: 44 }}>
            {t("footer.cookies")}
          </Link>
        </div>
        <div>© {new Date().getFullYear()} ATB — {t("footer.rights")}</div>
      </footer>
    </main>
  );
}
