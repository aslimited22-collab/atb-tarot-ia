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
  // Landing reduzida a 3 produtos, na ordem: Limpeza (herói) → Consulta
  // Completa R$197/mês → Pergunta avulsa R$29. Botões vão pelo roteador
  // /api/checkout/[plan] (decide Kiwify BR vs Stripe intl server-side por IP).

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
          </div>
        </div>
      </header>

      {/* HERO — produto principal: Limpeza Espiritual com ATB */}
      <section style={{ padding: "80px 24px 90px", background: "radial-gradient(ellipse at 50% -10%, #4a1a7a 0%, #2a0055 35%, #120025 72%)", position: "relative", overflow: "hidden" }}>
        <div className="glow-aura" style={{ top: "-14%", left: "6%", width: 520, height: 520 }} aria-hidden="true" />
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 40, alignItems: "center", position: "relative", zIndex: 1 }}>

          {/* Texto à esquerda */}
          <div className="fade-in-up" style={{ textAlign: "left" }}>
            <div style={{ fontSize: 18, color: S.gold, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>
              {t("landing.hero_badge")}
            </div>
            <h1 className="serif" style={{ fontSize: "clamp(2.6rem,6vw,4.6rem)", color: S.text, lineHeight: 1.1, marginBottom: 24, fontWeight: 700 }}>
              {t("hero.title_1")}<br/>
              <span className="text-gold-gradient">{t("hero.title_2")}</span>
            </h1>
            <p style={{ fontSize: "1.4rem", color: S.text, maxWidth: 560, marginBottom: 36, lineHeight: 1.6, fontWeight: 500 }}>
              {t("hero.desc")}
            </p>
            <a
              href="/api/checkout/limpeza"
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
              {t("landing.payment_cta")} — {t("landing.limpeza_price")}
            </a>
            <p style={{ fontSize: 18, color: S.text, marginTop: 16, fontWeight: 600 }}>
              <span aria-hidden="true">🔒</span> {t("landing.payment_once")}
            </p>
            <p style={{ fontSize: 16, color: S.text2, marginTop: 10, fontWeight: 500, maxWidth: 520 }}>
              {t("landing.hero_trust")}
            </p>
          </div>

          {/* Imagem à direita — altar sagrado (clara e acolhedora; a antiga era escura e parecia caixa vazia) */}
          <div className="fade-in-up floaty" style={{ position: "relative", borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 70px rgba(232,184,75,0.35), 0 0 0 3px rgba(232,184,75,0.45)" }}>
            <Image
              src="/img/limpeza-altar.png"
              alt={t("landing.altar_alt")}
              width={1536}
              height={1024}
              priority
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        </div>
      </section>

      {/* Como funciona — 3 passos simples (tira o medo do "e agora?") */}
      <section style={{ padding: "50px 24px", background: "#160030" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 className="serif text-gold-gradient" style={{ fontSize: "clamp(1.7rem,4vw,2.4rem)", textAlign: "center", marginBottom: 10, fontWeight: 700 }}>
            {t("landing.howto_title")}
          </h2>
          <div className="ornament" style={{ marginBottom: 30 }} aria-hidden="true">✦</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
            {[t("landing.howto_1"), t("landing.howto_2"), t("landing.howto_3")].map((step, i) => (
              <div key={i} className="card lift" style={{ padding: "30px 24px", textAlign: "center" }}>
                <div className="serif" style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, #f5c860, #c89a2a)", color: "#1e0040", fontSize: 30, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(232,184,75,0.35)" }}>{i + 1}</div>
                <p style={{ fontSize: 19, color: S.text, lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quem é a ATB — âncora humana (tira o medo de "caixa anônima"/charlatão) */}
      <section style={{ padding: "10px 24px 54px", background: "#160030" }}>
        <div className="card-gold" style={{ maxWidth: 760, margin: "0 auto", padding: "34px 30px", textAlign: "center" }}>
          <div style={{ fontSize: 46, marginBottom: 10 }} aria-hidden="true">🙏</div>
          <h2 className="serif" style={{ fontSize: "clamp(1.7rem,4vw,2.3rem)", color: S.gold, marginBottom: 14, fontWeight: 700 }}>
            {t("landing.about_title")}
          </h2>
          <p style={{ fontSize: 20, color: S.text, lineHeight: 1.65, fontWeight: 500, margin: 0, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            {t("landing.about_desc")}
          </p>
        </div>
      </section>

      {/* PRODUTO 1 — Limpeza Espiritual (herói, R$100 pagamento único) */}
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
            <h2 className="serif text-gold-gradient" style={{ fontSize: "clamp(2.4rem,6vw,3.8rem)", lineHeight: 1.1, marginBottom: 16 }}>
              {t("landing.limpeza_h2")}
            </h2>
            <div className="ornament" style={{ marginBottom: 20 }} aria-hidden="true">✦</div>
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
              <div key={c.title} className="lift" style={{
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

          {/* FAQ — responde as objeções logo antes do botão (tira o medo do Pix) */}
          <div className="card" style={{ maxWidth: 720, margin: "0 auto 36px", padding: "32px 28px" }}>
            <h3 className="serif" style={{ fontSize: "1.6rem", color: S.gold, textAlign: "center", marginBottom: 22, fontWeight: 700 }}>
              {t("landing.faq_title")}
            </h3>
            {[
              { q: t("landing.faq_q1"), a: t("landing.faq_a1") },
              { q: t("landing.faq_q2"), a: t("landing.faq_a2") },
              { q: t("landing.faq_q3"), a: t("landing.faq_a3") },
              { q: t("landing.faq_q4"), a: t("landing.faq_a4") },
              { q: t("landing.faq_q5"), a: t("landing.faq_a5") },
              { q: t("landing.faq_q6"), a: t("landing.faq_a6") },
            ].map((item, i, arr) => (
              <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < arr.length - 1 ? `1px solid ${S.sep}` : "none" }}>
                <div style={{ fontSize: 19, color: S.text, fontWeight: 700, marginBottom: 6 }}>
                  <span aria-hidden="true">❓</span> {item.q}
                </div>
                <p style={{ fontSize: 18, color: S.text2, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{item.a}</p>
              </div>
            ))}
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
            <div className="serif text-gold-gradient" style={{ fontSize: "clamp(3.4rem, 8vw, 4.5rem)", fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>
              {t("landing.limpeza_price")}
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
              {t("landing.payment_cta")} — {t("landing.limpeza_price")}
            </a>
            <div style={{ marginTop: 22, padding: "16px 20px", background: "rgba(232,184,75,0.08)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.2)" }}>
              <p style={{ fontSize: 18, color: "#fbf8ff", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                <span aria-hidden="true">🔒</span> <strong>{t("landing.trust_secure")}</strong><br />
                {t("landing.trust_methods")}<br />
                {t("landing.trust_delivery")}
              </p>
            </div>
            <p style={{ fontSize: 17, color: S.text, lineHeight: 1.6, marginTop: 18, fontWeight: 600 }}>
              {t("landing.trust_guarantee")}
            </p>
            <p style={{ fontSize: 16, color: S.text2, lineHeight: 1.6, marginTop: 10, fontWeight: 500 }}>
              {t("landing.cta_reassure")}
            </p>
          </div>
        </div>
      </section>

      {/* O que você recebe conversando com a ATB (apoia a Consulta Completa) */}
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
              <div key={f.title} className="card lift" style={{ padding: "26px 22px", textAlign: "center", border: "1.5px solid rgba(232,184,75,0.25)" }}>
                <div style={{ fontSize: 52, marginBottom: 14 }} aria-hidden="true">{f.icon}</div>
                <h3 className="serif" style={{ fontSize: "1.4rem", color: S.gold, marginBottom: 10, fontWeight: 700 }}>{f.title}</h3>
                <p style={{ color: S.text, fontSize: 19, lineHeight: 1.6, fontWeight: 500 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUTOS 2 e 3 — Consulta Completa R$197/mês + Pergunta avulsa R$29 */}
      <section id="planos" style={{ padding: "70px 24px", background: "radial-gradient(ellipse at 50% 100%, #2a0055 0%, #120025 70%)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 className="serif text-gold-gradient" style={{ fontSize: "clamp(2rem,5vw,3rem)", textAlign: "center", marginBottom: 14, fontWeight: 700 }}>
            {t("plans.title")}
          </h2>
          <div className="ornament" style={{ marginBottom: 22 }} aria-hidden="true">✦</div>
          <p style={{ fontSize: 21, color: S.text, textAlign: "center", marginBottom: 40, lineHeight: 1.55, maxWidth: 580, margin: "0 auto 40px", fontWeight: 500 }}>
            {t("landing.plans_subtitle")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20, alignItems: "stretch" }}>

            {/* PRODUTO 2 — CONSULTA COMPLETA (Premium R$197/mês: consulta + numerologia + tratamento espiritual) */}
            <div className="card-gold lift" style={{ padding: "36px 28px", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
              {/* Decoração: bolas douradas sutis no topo */}
              <div style={{ position: "absolute", top: -20, right: -20, display: "flex", gap: 8, opacity: 0.18, pointerEvents: "none" }} aria-hidden="true">
                {[42, 27, 13].map((n, i) => (
                  <div key={i} style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "radial-gradient(circle at 30% 30%, #f5c860, #c89a2a)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#1e0040",
                  }}>{n}</div>
                ))}
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, background: S.gold, color: "#120025", borderRadius: 999, padding: "5px 16px", display: "inline-block", marginBottom: 14, alignSelf: "flex-start", letterSpacing: "0.05em" }}>{t("plans.premium.numerologia_badge")}</div>
              <h3 className="serif" style={{ fontSize: "1.95rem", color: S.gold, marginBottom: 6, fontWeight: 700, lineHeight: 1.1 }}>
                {t("plans.premium.numerologia_title")}
              </h3>
              <p style={{ fontSize: 15, color: S.text2, marginBottom: 16, fontWeight: 500, lineHeight: 1.45 }}>
                {t("plans.premium.numerologia_subtitle")}
              </p>
              <div style={{ fontSize: "2.6rem", fontWeight: 800, color: S.text, marginBottom: 24, lineHeight: 1 }}>
                {t("plans.premium_price")} <span style={{ fontSize: 18, fontWeight: 400, color: S.text2 }}>{t("price.perMonth")}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", flex: 1 }}>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 17, fontWeight: 500, lineHeight: 1.5 }}>✦ {t("plans.premium.numerologia_f1")}</li>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 17, fontWeight: 500, lineHeight: 1.5 }}>✦ {t("plans.premium.numerologia_f2")}</li>
                <li style={{ color: S.text, marginBottom: 12, fontSize: 17, fontWeight: 500, lineHeight: 1.5 }}>✦ {t("plans.premium.numerologia_f3")}</li>
                <li style={{ color: S.text, fontSize: 17, lineHeight: 1.5 }}>✦ {t("plans.premium.numerologia_f4")}</li>
              </ul>
              <a href="/api/checkout/premium" className="btn-gold btn-big" style={{ textAlign: "center", display: "block", padding: "20px 24px", fontSize: "1.2rem", fontWeight: 800, textDecoration: "none", border: "none" }}>{t("plans.premium.numerologia_cta")}</a>
              <p style={{ fontSize: 13, color: S.text2, marginTop: 12, textAlign: "center", fontWeight: 600 }}>{t("landing.recurring_note")}</p>
              <p style={{ fontSize: 12, color: S.muted, marginTop: 14, fontStyle: "italic", lineHeight: 1.5, textAlign: "center" }}>
                {t("plans.premium.numerologia_disclaimer")}
              </p>
            </div>

            {/* PRODUTO 3 — PERGUNTA avulsa (R$29, pagamento único, 1 pergunta à ATB) */}
            <div className="card lift" style={{ padding: "36px 28px", display: "flex", flexDirection: "column", border: "2px solid rgba(232,184,75,0.4)" }}>
              <h3 className="serif" style={{ fontSize: "1.8rem", color: S.gold, marginBottom: 8, fontWeight: 700, lineHeight: 1.1 }}>
                {t("landing.pergunta_card_1_h")}
              </h3>
              <div style={{ fontSize: "2.6rem", fontWeight: 800, color: S.text, marginBottom: 10, lineHeight: 1 }}>
                {t("landing.pergunta_card_1_price")}
              </div>
              <p style={{ fontSize: 17, color: S.text, marginBottom: 24, fontWeight: 500, lineHeight: 1.5 }}>
                {t("landing.pergunta_subtitle")}
              </p>
              <div style={{ flex: 1 }} />
              <a href="/api/checkout/pergunta1" className="btn-gold btn-big" style={{ textAlign: "center", display: "block", padding: "20px 24px", fontSize: "1.2rem", fontWeight: 800, textDecoration: "none", border: "none" }}>{t("landing.pergunta_card_cta")}</a>
              <p style={{ fontSize: 15, color: S.muted, marginTop: 14, lineHeight: 1.5, textAlign: "center", fontWeight: 500 }}>
                {t("landing.pergunta_security")}
              </p>
            </div>

            {/* PRODUTO 4 — SESSÃO AO VIVO / Vídeo Chamada (R$877) — leva pra página de vendas /videochamada */}
            <div className="card lift" style={{ padding: "36px 28px", display: "flex", flexDirection: "column", border: "2px solid rgba(232,184,75,0.55)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, background: S.gold, color: "#120025", borderRadius: 999, padding: "5px 16px", display: "inline-block", marginBottom: 14, alignSelf: "flex-start", letterSpacing: "0.05em" }}>{t("landing.video_card_badge")}</div>
              <h3 className="serif" style={{ fontSize: "1.8rem", color: S.gold, marginBottom: 8, fontWeight: 700, lineHeight: 1.1 }}>
                {t("landing.video_card_title")}
              </h3>
              <div style={{ fontSize: "2.6rem", fontWeight: 800, color: S.text, marginBottom: 10, lineHeight: 1 }}>
                {t("landing.video_card_price")}
              </div>
              <p style={{ fontSize: 17, color: S.text, marginBottom: 24, fontWeight: 500, lineHeight: 1.5 }}>
                {t("landing.video_card_desc")}
              </p>
              <div style={{ flex: 1 }} />
              <a href="/videochamada?utm_source=home&utm_medium=card&utm_campaign=card_video" className="btn-gold btn-big" style={{ textAlign: "center", display: "block", padding: "20px 24px", fontSize: "1.2rem", fontWeight: 800, textDecoration: "none", border: "none" }}>{t("landing.video_card_cta")}</a>
              <p style={{ fontSize: 15, color: S.muted, marginTop: 14, lineHeight: 1.5, textAlign: "center", fontWeight: 500 }}>
                {t("landing.video_card_note")}
              </p>
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
            <div key={tm.name} className="card lift" style={{ padding: "28px 24px" }}>
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
