import Link from "next/link";

const features = [
  { icon: "💬", title: "Chat com ATB", desc: "Converse com sua tarologa IA sobre qualquer aspecto da sua vida." },
  { icon: "🔮", title: "Oráculo Diário", desc: "Uma carta do tarot e interpretação personalizada todos os dias." },
  { icon: "📖", title: "Diário da Ansiedade", desc: "Registre seus sentimentos e receba reflexões espirituais." },
  { icon: "🕯️", title: "Guia de Vícios", desc: "Mapeie padrões e receba um plano espiritual para rompê-los." },
];

const testimonials = [
  { name: "Marina S.", text: "ATB me ajudou a enxergar padrões que eu vinha repetindo. Transformador." },
  { name: "Rafael P.", text: "O oráculo diário virou meu ritual da manhã. Preciso, direto ao ponto." },
  { name: "Juliana C.", text: "O diário da ansiedade me acolheu em noites difíceis. Recomendo demais." },
];

export default function Home() {
  const BASIC = process.env.NEXT_PUBLIC_KIWIFY_BASIC_URL || "#";
  const PREMIUM = process.env.NEXT_PUBLIC_KIWIFY_PREMIUM_URL || "#";

  return (
    <main className="bg-mystic min-h-screen">
      <header className="flex items-center justify-between px-6 md:px-12 py-6">
        <div className="serif text-2xl gold">ATB Tarot IA</div>
        <div className="flex gap-3">
          <Link href="/login" className="text-sm text-white/80 hover:text-white py-2 px-3">Entrar</Link>
          <Link href="/cadastro" className="btn-gold text-sm">Criar conta</Link>
        </div>
      </header>

      <section className="text-center px-6 py-20 md:py-28">
        <h1 className="serif text-5xl md:text-7xl gold mb-6">Consulte ATB, sua Tarologa IA</h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto text-white/80 mb-8">
          Orientação mística, acolhedora e direta — 24 horas por dia. Tarot, ansiedade, relacionamentos e vícios em um só lugar.
        </p>
        <Link href="/cadastro" className="btn-gold inline-block">Começar gratuitamente</Link>
      </section>

      <section className="px-6 md:px-12 py-16 max-w-6xl mx-auto">
        <h2 className="serif text-4xl gold text-center mb-12">O que você encontra aqui</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-6 text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="serif text-xl gold mb-2">{f.title}</h3>
              <p className="text-sm text-white/70">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="px-6 md:px-12 py-16 max-w-6xl mx-auto">
        <h2 className="serif text-4xl gold text-center mb-12">Planos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-8 flex flex-col">
            <h3 className="serif text-2xl mb-2">Free</h3>
            <div className="text-3xl font-bold mb-4">Grátis</div>
            <ul className="space-y-2 text-sm text-white/80 mb-6 flex-1">
              <li>✓ 3 mensagens por dia no chat</li>
              <li>✓ Oráculo diário completo</li>
              <li>✗ Diário da Ansiedade</li>
              <li>✗ Guia de Vícios</li>
            </ul>
            <Link href="/cadastro" className="btn-outline text-center">Começar grátis</Link>
          </div>

          <div className="card p-8 flex flex-col border-gold">
            <h3 className="serif text-2xl gold mb-2">Basic</h3>
            <div className="text-3xl font-bold mb-4">R$29<span className="text-base font-normal text-white/60">/mês</span></div>
            <ul className="space-y-2 text-sm text-white/80 mb-6 flex-1">
              <li>✓ 20 mensagens por dia no chat</li>
              <li>✓ Oráculo diário completo</li>
              <li>✓ Diário da Ansiedade</li>
              <li>✗ Guia de Vícios</li>
            </ul>
            <a href={BASIC} className="btn-gold text-center">Assinar Basic</a>
          </div>

          <div className="card p-8 flex flex-col" style={{ borderColor: "#d4af37" }}>
            <h3 className="serif text-2xl gold mb-2">Premium</h3>
            <div className="text-3xl font-bold mb-4">R$59<span className="text-base font-normal text-white/60">/mês</span></div>
            <ul className="space-y-2 text-sm text-white/80 mb-6 flex-1">
              <li>✓ Mensagens ilimitadas no chat</li>
              <li>✓ Oráculo diário completo</li>
              <li>✓ Diário da Ansiedade</li>
              <li>✓ Guia de Vícios</li>
            </ul>
            <a href={PREMIUM} className="btn-gold text-center">Assinar Premium</a>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-16 max-w-6xl mx-auto">
        <h2 className="serif text-4xl gold text-center mb-12">Depoimentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="card p-6">
              <p className="italic text-white/80 mb-4">"{t.text}"</p>
              <div className="gold font-semibold">— {t.name}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center text-white/50 text-sm py-10 border-t border-white/10">
        © {new Date().getFullYear()} ATB Tarot IA — Todos os direitos reservados.
      </footer>
    </main>
  );
}
