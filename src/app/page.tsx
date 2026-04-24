import Link from "next/link";

const features = [
  { icon: "💬", title: "Chat com ATB", desc: "Converse com sua tarologa sobre qualquer aspecto da sua vida." },
  { icon: "🔮", title: "Oráculo Diário", desc: "Uma carta do tarot e interpretação personalizada todos os dias." },
  { icon: "📖", title: "Diário da Ansiedade", desc: "Registre seus sentimentos e receba reflexões espirituais." },
  { icon: "🕯️", title: "Guia de Vícios", desc: "Mapeie padrões e receba um plano espiritual para rompê-los." },
];

const testimonials = [
  { name: "Marina S.", text: "ATB me ajudou a enxergar padrões que eu vinha repetindo. Transformador." },
  { name: "Rafael P.", text: "O oráculo diário virou meu ritual da manhã. Preciso, direto ao ponto." },
  { name: "Juliana C.", text: "O diário da ansiedade me acolheu em noites difíceis. Recomendo demais." },
];

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
  const BASIC   = process.env.NEXT_PUBLIC_KIWIFY_BASIC_URL   || "#";
  const PREMIUM = process.env.NEXT_PUBLIC_KIWIFY_PREMIUM_URL || "#";

  return (
    <main style={{ background: S.bg, color: S.text, minHeight: "100vh" }}>

      {/* Header */}
      <header style={{ background: "rgba(30,0,64,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${S.sep}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="serif text-2xl" style={{ color: S.gold }}>ATB Tarot</span>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/login" style={{ color: S.text2, fontWeight: 600, fontSize: 16, textDecoration: "none" }}>Entrar</Link>
            <Link href="/cadastro" className="btn-gold" style={{ padding: "10px 22px", fontSize: 15 }}>Criar conta</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "80px 24px 72px", background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 65%)" }}>
        <div style={{ fontSize: 68, marginBottom: 18 }}>🔮</div>
        <h1 className="serif" style={{ fontSize: "clamp(2.4rem,6vw,5rem)", color: S.text, lineHeight: 1.12, marginBottom: 18 }}>
          Consulte ATB,<br/>sua Tarologa
        </h1>
        <p style={{ fontSize: "1.2rem", color: S.text2, maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Orientação mística, acolhedora e direta — 24 horas por dia. Tarot, ansiedade, relacionamentos e vícios em um só lugar.
        </p>
        <Link href="/cadastro" className="btn-gold" style={{ fontSize: "1.15rem", padding: "16px 40px" }}>
          Começar gratuitamente
        </Link>
      </section>

      {/* Features */}
      <section style={{ padding: "60px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 className="serif" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", color: S.gold, textAlign: "center", marginBottom: 36 }}>
          O que você encontra aqui
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
            Planos
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>

            <div className="card" style={{ padding: "32px 24px", display: "flex", flexDirection: "column" }}>
              <h3 className="serif" style={{ fontSize: "1.6rem", color: S.text, marginBottom: 4 }}>Free</h3>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: S.text, marginBottom: 20 }}>Grátis</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                <li style={{ color: S.text2, marginBottom: 8, fontSize: 15 }}>✓ 1 pergunta no chat</li>
                <li style={{ color: S.muted, marginBottom: 8, fontSize: 15 }}>✗ Oráculo diário</li>
                <li style={{ color: S.muted, marginBottom: 8, fontSize: 15 }}>✗ Diário da Ansiedade</li>
                <li style={{ color: S.muted, fontSize: 15 }}>✗ Guia de Vícios</li>
              </ul>
              <Link href="/cadastro" className="btn-outline" style={{ textAlign: "center", display: "block" }}>Começar grátis</Link>
            </div>

            <div className="card" style={{ padding: "32px 24px", display: "flex", flexDirection: "column", border: "1.5px solid rgba(232,184,75,0.5)" }}>
              <h3 className="serif" style={{ fontSize: "1.6rem", color: S.gold, marginBottom: 4 }}>Basic</h3>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: S.text, marginBottom: 20 }}>
                R$29 <span style={{ fontSize: 14, fontWeight: 400, color: S.muted }}>/mês</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                <li style={{ color: S.text2, marginBottom: 8, fontSize: 15 }}>✓ 20 mensagens por dia</li>
                <li style={{ color: S.text2, marginBottom: 8, fontSize: 15 }}>✓ Oráculo diário completo</li>
                <li style={{ color: S.text2, marginBottom: 8, fontSize: 15 }}>✓ Diário da Ansiedade</li>
                <li style={{ color: S.muted, fontSize: 15 }}>✗ Guia de Vícios</li>
              </ul>
              <a href={BASIC} className="btn-gold" style={{ textAlign: "center", display: "block" }}>Assinar Basic</a>
            </div>

            <div className="card-gold" style={{ padding: "32px 24px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, fontWeight: 700, background: S.gold, color: "#120025", borderRadius: 20, padding: "3px 12px", display: "inline-block", marginBottom: 10, alignSelf: "flex-start" }}>MAIS POPULAR</div>
              <h3 className="serif" style={{ fontSize: "1.6rem", color: S.gold, marginBottom: 4 }}>Premium</h3>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: S.text, marginBottom: 20 }}>
                R$59 <span style={{ fontSize: 14, fontWeight: 400, color: S.muted }}>/mês</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                <li style={{ color: S.text, marginBottom: 8, fontSize: 15 }}>✓ Mensagens ilimitadas</li>
                <li style={{ color: S.text, marginBottom: 8, fontSize: 15 }}>✓ Oráculo diário completo</li>
                <li style={{ color: S.text, marginBottom: 8, fontSize: 15 }}>✓ Diário da Ansiedade</li>
                <li style={{ color: S.text, fontSize: 15 }}>✓ Guia de Vícios</li>
              </ul>
              <a href={PREMIUM} className="btn-gold" style={{ textAlign: "center", display: "block" }}>Assinar Premium</a>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section style={{ padding: "60px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 className="serif" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", color: S.gold, textAlign: "center", marginBottom: 36 }}>
          Depoimentos
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {testimonials.map((t) => (
            <div key={t.name} className="card" style={{ padding: "24px" }}>
              <p style={{ fontStyle: "italic", color: S.text2, lineHeight: 1.75, marginBottom: 14, fontSize: 16 }}>"{t.text}"</p>
              <div style={{ fontWeight: 600, color: S.gold, fontSize: 15 }}>— {t.name}</div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "24px", borderTop: `1px solid ${S.sep}`, color: S.muted, fontSize: 14 }}>
        © {new Date().getFullYear()} ATB Tarot — Todos os direitos reservados.
      </footer>
    </main>
  );
}
