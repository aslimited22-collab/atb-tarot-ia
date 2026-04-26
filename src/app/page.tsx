"use client";
import Link from "next/link";
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
        <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🕊️</div>
            <div style={{ fontSize: 13, color: "#f5c860", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>
              ✨ Sessão Sagrada Exclusiva ✨
            </div>
            <h2 className="serif" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", color: S.gold, lineHeight: 1.15, marginBottom: 14 }}>
              Limpeza Espiritual<br />com ATB
            </h2>
            <p style={{ fontSize: "1.15rem", color: S.text2, maxWidth: 580, margin: "0 auto", lineHeight: 1.7 }}>
              Tire o peso da sua alma, abra os caminhos da vida e proteja-se de inveja com a força dos santos católicos. Uma sessão única e poderosa de descarrego com ATB.
            </p>
          </div>

          {/* Cartas de tarot */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 16,
            marginBottom: 36,
          }}>
            {[
              { icon: "🕯️", title: "Limpeza Profunda", saint: "Nossa Senhora Aparecida", desc: "Retire energia pesada, mau-olhado e dor da alma", color: "linear-gradient(135deg, #e8b84b 0%, #c89a2a 100%)" },
              { icon: "🗝️", title: "Abrir Caminhos", saint: "Santo Antônio", desc: "Desate os nós que travam sua vida e prosperidade", color: "linear-gradient(135deg, #6a4a8a 0%, #4a2f6a 100%)" },
              { icon: "⚔️", title: "Proteção Sagrada", saint: "São Miguel + São Jorge", desc: "Corte feitiços, demandas e inveja com a espada divina", color: "linear-gradient(135deg, #d4344a 0%, #8a1f30 100%)" },
            ].map((c) => (
              <div key={c.title} style={{
                background: c.color,
                borderRadius: 18,
                padding: "24px 20px",
                color: "#1e0040",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                border: "2px solid rgba(255,255,255,0.15)",
              }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>{c.icon}</div>
                <h3 className="serif" style={{ fontSize: "1.3rem", fontWeight: 700, lineHeight: 1.15, marginBottom: 4 }}>{c.title}</h3>
                <div style={{ fontSize: 12, opacity: 0.8, fontStyle: "italic", marginBottom: 10 }}>✦ {c.saint}</div>
                <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0, opacity: 0.92 }}>{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Lista de benefícios */}
          <div className="card-gold" style={{ padding: "26px 24px", marginBottom: 30 }}>
            <h3 className="serif" style={{ fontSize: "1.3rem", color: S.gold, textAlign: "center", marginBottom: 18 }}>
              O que você recebe na sua Limpeza
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
              {[
                { icon: "🕯️", text: "3 mensagens sagradas com ATB focadas só na sua limpeza" },
                { icon: "🗝️", text: "Identificação do que está pesando e bloqueando sua vida" },
                { icon: "👑", text: "Invocação dos santos certos para o seu caso" },
                { icon: "💧", text: "Banhos, defumações e orações personalizadas" },
                { icon: "⚔️", text: "Proteção contra inveja, mau-olhado e feitiço" },
                { icon: "✨", text: "Abertura de caminhos para prosperidade e amor" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
                  <span style={{ fontSize: 15, color: S.text, lineHeight: 1.55 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Santos */}
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{ fontSize: 12, color: S.text2, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
              Forças Sagradas que estarão com você
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24 }}>
              {[
                { icon: "👑", name: "N. S. Aparecida" },
                { icon: "❤️‍🔥", name: "Sagrado Coração" },
                { icon: "⚔️", name: "São Miguel" },
                { icon: "🙏", name: "Santo Antônio" },
                { icon: "🛡️", name: "São Jorge" },
                { icon: "🪢", name: "N. S. Desatadora" },
              ].map((s) => (
                <div key={s.name} style={{ textAlign: "center", width: 90 }}>
                  <div style={{ fontSize: 36, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, color: S.text, lineHeight: 1.3 }}>{s.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Compra */}
          <div style={{
            background: "linear-gradient(135deg, #1e0040 0%, #4a1a7a 50%, #1e0040 100%)",
            border: "2px solid rgba(232,184,75,0.6)",
            borderRadius: 20,
            padding: "32px 24px",
            textAlign: "center",
            maxWidth: 560,
            margin: "0 auto",
            boxShadow: "0 12px 40px rgba(232,184,75,0.18)",
          }}>
            <div style={{ fontSize: 12, color: "#f5c860", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
              Investimento único
            </div>
            <div className="serif" style={{ fontSize: "3.4rem", color: S.gold, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
              R$ 100
            </div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 20 }}>
              Pagamento único • Acesso imediato após confirmação
            </div>
            <a
              href={LIMPEZA}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold"
              style={{ display: "inline-block", padding: "18px 36px", fontSize: "1.1rem", fontWeight: 700, textDecoration: "none" }}
            >
              ✨ Quero minha Limpeza Espiritual
            </a>
            <p style={{ fontSize: 12, color: S.muted, marginTop: 16, lineHeight: 1.55 }}>
              🔒 Pagamento seguro pela Kiwify • Cartão, Pix ou Boleto<br />
              Após pagar você cria sua conta e a limpeza fica liberada na hora
            </p>
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
