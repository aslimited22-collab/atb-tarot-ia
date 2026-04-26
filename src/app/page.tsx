"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";
import { LangSwitcher } from "@/components/LangSwitcher";
import { AltarSvg } from "@/components/AltarSvg";

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
  const BASIC   = process.env.NEXT_PUBLIC_KIWIFY_BASIC_URL   || "#";
  const PREMIUM = process.env.NEXT_PUBLIC_KIWIFY_PREMIUM_URL || "#";
  const LIMPEZA = process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL || "#";

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
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <LangSwitcher compact />
            <Link href="/login" style={{ color: S.text2, fontWeight: 600, fontSize: 16, textDecoration: "none" }}>{t("nav.signin")}</Link>
            <Link href="/cadastro" className="btn-gold" style={{ padding: "10px 22px", fontSize: 15 }}>{t("nav.signup")}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "80px 24px 72px", background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 65%)" }}>
        <div style={{ fontSize: 68, marginBottom: 18 }}>🔮</div>
        <h1 className="serif" style={{ fontSize: "clamp(2.4rem,6vw,5rem)", color: S.text, lineHeight: 1.12, marginBottom: 18 }}>
          {t("hero.title_1")}<br/>{t("hero.title_2")}
        </h1>
        <p style={{ fontSize: "1.2rem", color: S.text2, maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.7 }}>
          {t("hero.desc")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/cadastro" className="btn-gold" style={{ fontSize: "1.05rem", padding: "16px 32px", textDecoration: "none" }}>
            {t("hero.cta")}
          </Link>
          <a href="#limpeza" className="btn-outline" style={{
            fontSize: "1.05rem",
            padding: "16px 32px",
            textDecoration: "none",
            color: S.gold,
            border: `2px solid ${S.gold}`,
            borderRadius: 999,
            fontWeight: 700,
            display: "inline-block",
          }}>
            🕊️ Limpeza Espiritual
          </a>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "60px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 className="serif" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", color: S.gold, textAlign: "center", marginBottom: 36 }}>
          {t("features.title")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {features.map((f) => (
            <div key={f.title} className="card" style={{ padding: "28px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{f.icon}</div>
              <h3 className="serif" style={{ fontSize: "1.25rem", color: S.gold, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: S.text2, fontSize: 15, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
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
            {/* Ilustração SVG do altar sagrado */}
            <div style={{ marginBottom: 18 }}>
              <AltarSvg size={280} />
            </div>

            <div style={{ fontSize: 16, color: "#f5c860", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              ✨ Sessão Sagrada Exclusiva ✨
            </div>
            <h2 className="serif" style={{ fontSize: "clamp(2.4rem,6vw,3.8rem)", color: S.gold, lineHeight: 1.1, marginBottom: 18 }}>
              Limpeza Espiritual<br />com ATB
            </h2>
            <p style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.4rem)", color: S.text, maxWidth: 620, margin: "0 auto", lineHeight: 1.65, fontWeight: 500 }}>
              Tire o peso da sua alma, abra os caminhos da sua vida e proteja-se de toda inveja com a força dos santos.
            </p>
          </div>

          {/* Cartas de tarot — maiores para 60+ */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 18,
            marginBottom: 40,
          }}>
            {[
              { icon: "🕯️", title: "Limpeza Profunda", saint: "Nossa Senhora Aparecida", desc: "Tira energia pesada, mau-olhado e a dor da alma", color: "linear-gradient(135deg, #e8b84b 0%, #c89a2a 100%)" },
              { icon: "🗝️", title: "Abrir Caminhos", saint: "Santo Antônio", desc: "Desata o que está travando sua vida e o seu dinheiro", color: "linear-gradient(135deg, #6a4a8a 0%, #4a2f6a 100%)" },
              { icon: "⚔️", title: "Proteção", saint: "São Miguel e São Jorge", desc: "Corta feitiço, inveja e olho gordo com a espada divina", color: "linear-gradient(135deg, #d4344a 0%, #8a1f30 100%)" },
            ].map((c) => (
              <div key={c.title} style={{
                background: c.color,
                borderRadius: 22,
                padding: "30px 24px",
                color: "#1e0040",
                boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                border: "3px solid rgba(255,255,255,0.2)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 60, marginBottom: 14 }}>{c.icon}</div>
                <h3 className="serif" style={{ fontSize: "1.55rem", fontWeight: 700, lineHeight: 1.15, marginBottom: 6 }}>{c.title}</h3>
                <div style={{ fontSize: 14, opacity: 0.85, fontStyle: "italic", marginBottom: 14, fontWeight: 500 }}>✦ {c.saint}</div>
                <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0, fontWeight: 500 }}>{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Lista de benefícios — fonte grande para 60+ */}
          <div className="card-gold" style={{ padding: "32px 28px", marginBottom: 36 }}>
            <h3 className="serif" style={{ fontSize: "1.6rem", color: S.gold, textAlign: "center", marginBottom: 24 }}>
              O que você recebe
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
              {[
                { icon: "🕯️", text: "Conversa sagrada com ATB só sobre a sua limpeza" },
                { icon: "🗝️", text: "ATB descobre o que está te pesando" },
                { icon: "👑", text: "Os santos certos para o seu caso" },
                { icon: "💧", text: "Banho de ervas e oração feita pra você" },
                { icon: "⚔️", text: "Proteção contra inveja e olho gordo" },
                { icon: "✨", text: "Abertura dos seus caminhos" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "center", padding: "8px 0" }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>{b.icon}</span>
                  <span style={{ fontSize: 17, color: S.text, lineHeight: 1.5, fontWeight: 500 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Santos — maiores para 60+ */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 16, color: S.gold, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20 }}>
              ✨ Os santos que vão estar com você ✨
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 28 }}>
              {[
                { icon: "👑", name: "N. S. Aparecida" },
                { icon: "❤️‍🔥", name: "Sagrado Coração" },
                { icon: "⚔️", name: "São Miguel" },
                { icon: "🙏", name: "Santo Antônio" },
                { icon: "🛡️", name: "São Jorge" },
                { icon: "🪢", name: "N. S. Desatadora" },
              ].map((s) => (
                <div key={s.name} style={{
                  textAlign: "center",
                  width: 110,
                  padding: "14px 8px",
                  background: "rgba(232,184,75,0.06)",
                  borderRadius: 14,
                  border: "1px solid rgba(232,184,75,0.2)",
                }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 13, color: S.text, lineHeight: 1.35, fontWeight: 600 }}>{s.name}</div>
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
            <div style={{ fontSize: 16, color: "#f5c860", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontWeight: 700 }}>
              Pagamento único
            </div>
            <div className="serif" style={{ fontSize: "clamp(3.4rem, 8vw, 4.5rem)", color: S.gold, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>
              R$ 100
            </div>
            <div style={{ fontSize: 16, color: "#fbf8ff", marginBottom: 28, fontWeight: 500 }}>
              Você paga uma vez só
            </div>
            <a
              href={LIMPEZA}
              target="_blank"
              rel="noopener noreferrer"
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
              ✨ Quero minha Limpeza
            </a>
            <div style={{ marginTop: 22, padding: "14px 18px", background: "rgba(232,184,75,0.08)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.2)" }}>
              <p style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                🔒 <strong>Pagamento totalmente seguro</strong><br />
                Você pode pagar com Cartão, Pix ou Boleto<br />
                Logo depois de pagar, sua limpeza está pronta
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" style={{ padding: "60px 24px", background: "radial-gradient(ellipse at 50% 100%, #2a0055 0%, #120025 70%)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", color: S.gold, textAlign: "center", marginBottom: 36 }}>
            {t("plans.title")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>

            <div className="card" style={{ padding: "32px 24px", display: "flex", flexDirection: "column" }}>
              <h3 className="serif" style={{ fontSize: "1.6rem", color: S.text, marginBottom: 4 }}>{t("plans.free.name")}</h3>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: S.text, marginBottom: 20 }}>{t("plans.free.price")}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                <li style={{ color: S.text2, marginBottom: 8, fontSize: 15 }}>{t("plans.free.f1")}</li>
                <li style={{ color: S.muted, marginBottom: 8, fontSize: 15 }}>{t("plans.free.f2")}</li>
                <li style={{ color: S.muted, marginBottom: 8, fontSize: 15 }}>{t("plans.free.f3")}</li>
                <li style={{ color: S.muted, fontSize: 15 }}>{t("plans.free.f4")}</li>
              </ul>
              <Link href="/cadastro" className="btn-outline" style={{ textAlign: "center", display: "block" }}>{t("plans.free.cta")}</Link>
            </div>

            <div className="card" style={{ padding: "32px 24px", display: "flex", flexDirection: "column", border: "1.5px solid rgba(232,184,75,0.5)" }}>
              <h3 className="serif" style={{ fontSize: "1.6rem", color: S.gold, marginBottom: 4 }}>{t("plans.basic.name")}</h3>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: S.text, marginBottom: 20 }}>
                R$29 <span style={{ fontSize: 14, fontWeight: 400, color: S.muted }}>{t("plans.basic.period")}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                <li style={{ color: S.text2, marginBottom: 8, fontSize: 15 }}>{t("plans.basic.f1")}</li>
                <li style={{ color: S.text2, marginBottom: 8, fontSize: 15 }}>{t("plans.basic.f2")}</li>
                <li style={{ color: S.text2, marginBottom: 8, fontSize: 15 }}>{t("plans.basic.f3")}</li>
                <li style={{ color: S.muted, fontSize: 15 }}>{t("plans.basic.f4")}</li>
              </ul>
              <a href={BASIC} className="btn-gold" style={{ textAlign: "center", display: "block" }}>{t("plans.basic.cta")}</a>
            </div>

            <div className="card-gold" style={{ padding: "32px 24px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, fontWeight: 700, background: S.gold, color: "#120025", borderRadius: 20, padding: "3px 12px", display: "inline-block", marginBottom: 10, alignSelf: "flex-start" }}>{t("plans.premium.badge")}</div>
              <h3 className="serif" style={{ fontSize: "1.6rem", color: S.gold, marginBottom: 4 }}>{t("plans.premium.name")}</h3>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: S.text, marginBottom: 20 }}>
                R$59 <span style={{ fontSize: 14, fontWeight: 400, color: S.muted }}>{t("plans.basic.period")}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                <li style={{ color: S.text, marginBottom: 8, fontSize: 15 }}>{t("plans.premium.f1")}</li>
                <li style={{ color: S.text, marginBottom: 8, fontSize: 15 }}>{t("plans.premium.f2")}</li>
                <li style={{ color: S.text, marginBottom: 8, fontSize: 15 }}>{t("plans.premium.f3")}</li>
                <li style={{ color: S.text, fontSize: 15 }}>{t("plans.premium.f4")}</li>
              </ul>
              <a href={PREMIUM} className="btn-gold" style={{ textAlign: "center", display: "block" }}>{t("plans.premium.cta")}</a>
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
            <div key={tm.name} className="card" style={{ padding: "24px" }}>
              <p style={{ fontStyle: "italic", color: S.text2, lineHeight: 1.75, marginBottom: 14, fontSize: 16 }}>"{tm.text}"</p>
              <div style={{ fontWeight: 600, color: S.gold, fontSize: 15 }}>— {tm.name}</div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "24px", borderTop: `1px solid ${S.sep}`, color: S.muted, fontSize: 14 }}>
        © {new Date().getFullYear()} ATB Tarot — {t("footer.rights")}
      </footer>
    </main>
  );
}
