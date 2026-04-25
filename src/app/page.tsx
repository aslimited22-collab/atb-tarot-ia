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
        <Link href="/cadastro" className="btn-gold" style={{ fontSize: "1.15rem", padding: "16px 40px" }}>
          {t("hero.cta")}
        </Link>
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
