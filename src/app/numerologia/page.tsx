import type { Metadata } from "next";
import Link from "next/link";

// Página de venda do produto "Numerologia" (R$45) — PT-hardcoded (produto
// BR-first; precedente: /limpeza-espiritual, /limpeza/previa). Nome do produto
// IDÊNTICO ao checkout: "Numerologia" (planDisplayName + produto Kiwify).
//
// RASTREAMENTO: o CTA aponta pra /api/checkout/numerologia — o
// GoogleAdsFunnelEvents (layout) dispara begin_checkout no clique e o roteador
// decide BR (Kiwify) vs intl (Stripe) e anexa gclid/utm/s1 automaticamente.

export const metadata: Metadata = {
  title: "Numerologia — Seus Números da Sorte Pessoais | ATB",
  description:
    "Descubra seus números da sorte pessoais, calculados pelo seu nome completo e data de nascimento. Mapa completo em PDF no seu e-mail em até 24h. Pagamento único de R$45.",
  alternates: { canonical: "https://atbtartot.com/numerologia" },
  robots: { index: true, follow: true },
};

const CHECKOUT = "/api/checkout/numerologia"; // begin_checkout + gclid automáticos
const CTA_LABEL = "Quero minha Numerologia — R$45";
const TRUST_LINE = "Pix, cartão ou boleto • Pagamento único • Chega em PDF no seu e-mail";

const recebe = [
  ["🔢", "Seus números da sorte pessoais", "Calculados pela numerologia clássica a partir do seu nome completo e da sua data de nascimento. São seus, de mais ninguém."],
  ["📖", "O significado de cada número", "O que o seu Número do Destino, da Alma, de Expressão e do seu Ano Pessoal revelam sobre a sua vida, seu coração e seus dons."],
  ["🗓️", "Como e quando usar", "Orientações práticas: em que datas, decisões e momentos de proteção se apoiar em cada número."],
  ["📄", "Mapa completo em PDF", "Um documento bonito, feito com carinho, pra guardar pra sempre. Chega no seu e-mail em até 24h — normalmente em minutos."],
];

const passos = [
  ["1", "Você garante seu mapa", "Pagamento único de R$45 — Pix, cartão ou boleto, 100% seguro."],
  ["2", "Você informa seus dados", "Só o seu nome completo e a sua data de nascimento. Leva 1 minuto."],
  ["3", "Seu mapa chega no e-mail", "A ATB prepara seu mapa e ele chega em PDF, com seus números e todas as orientações."],
];

const faq: [string, string][] = [
  ["Como os números são calculados?", "Pela numerologia pitagórica clássica: seu nome completo e sua data de nascimento geram seus números pessoais — Destino, Alma, Expressão e Ano Pessoal."],
  ["Vou ter que pagar todo mês?", "Não. É pagamento único de R$45. O mapa é seu pra sempre."],
  ["Em quanto tempo recebo?", "Em até 24 horas no seu e-mail — na maioria das vezes, poucos minutos depois de você informar seus dados."],
  ["Serve pra jogar na loteria?", "Não prometemos ganhos em jogos ou dinheiro. Seus números são guias espirituais pra decisões, datas e proteção — use com fé e sabedoria."],
  ["Preciso instalar algo?", "Não. O mapa chega em PDF no seu e-mail. É só abrir no celular e guardar."],
];

const S = {
  bg: "#120025",
  gold: "#e8b84b",
  gold2: "#f6d67e",
  text: "#f5f0ff",
  text2: "#c4b5fd",
  muted: "#9575cd",
  sep: "rgba(196,181,253,0.18)",
};

const btnGold: React.CSSProperties = {
  display: "block",
  background: `linear-gradient(135deg, ${S.gold2}, ${S.gold})`,
  color: "#3a2400",
  fontWeight: 800,
  textDecoration: "none",
  padding: "20px 28px",
  borderRadius: 16,
  fontSize: "1.2rem",
  textAlign: "center",
  boxShadow: "0 12px 34px rgba(232,184,75,0.32)",
  lineHeight: 1.3,
};

const trustStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: "0.9rem",
  color: S.text2,
  textAlign: "center",
  lineHeight: 1.5,
  fontWeight: 500,
};

export default function NumerologiaPage() {
  return (
    <main style={{ background: S.bg, color: S.text, minHeight: "100vh" }}>
      <header style={{ borderBottom: `1px solid ${S.sep}`, background: "rgba(30,0,64,0.9)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 22px", textAlign: "center" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span className="serif" style={{ color: S.gold, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.28em" }}>ATB</span>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section style={{ padding: "56px 22px 48px", background: "radial-gradient(ellipse at 60% -10%, #4a1a7a 0%, #2a0055 38%, #120025 74%)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div style={{ color: S.gold, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 15, marginBottom: 18 }}>
            ✦ Numerologia • Seus números, seu caminho
          </div>
          <h1 className="serif" style={{ fontSize: "2.6rem", lineHeight: 1.12, margin: "0 0 20px", fontWeight: 700 }}>
            Descubra os números da sorte que nasceram com você
          </h1>
          <p style={{ fontSize: "1.15rem", color: S.text2, lineHeight: 1.55, marginBottom: 28 }}>
            Seu nome completo e sua data de nascimento guardam números que falam do seu destino, do seu coração e dos seus dons. A <b style={{ color: S.text }}>Numerologia</b> da ATB revela cada um deles — e como usar — num mapa completo em PDF.
          </p>
          <a href={CHECKOUT} style={{ ...btnGold, maxWidth: 460, margin: "0 auto" }}>✦ {CTA_LABEL}</a>
          <p style={trustStyle}>{TRUST_LINE}</p>
        </div>
      </section>

      {/* O QUE VOCÊ RECEBE */}
      <section style={{ padding: "56px 22px", background: "rgba(0,0,0,0.18)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "2rem", textAlign: "center", marginBottom: 8, fontWeight: 700 }}>O que vem no seu mapa</h2>
          <p style={{ textAlign: "center", color: S.text2, marginBottom: 34, fontSize: "1.05rem" }}>
            Não é um número genérico da internet. É calculado do SEU nome e da SUA data.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {recebe.map(([ic, t, d]) => (
              <li key={t} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 0", borderBottom: `1px dashed ${S.sep}` }}>
                <span style={{ fontSize: "1.7rem", flex: "none", lineHeight: 1 }} aria-hidden="true">{ic}</span>
                <div>
                  <b style={{ color: S.gold2, fontSize: "1.08rem" }}>{t}</b>
                  <p style={{ color: S.text2, marginTop: 3, lineHeight: 1.5 }}>{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section style={{ padding: "56px 22px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "2rem", textAlign: "center", marginBottom: 36, fontWeight: 700 }}>Como funciona — bem simples</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {passos.map(([n, t, d]) => (
              <div key={n} style={{ textAlign: "center", padding: "10px 16px" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.3rem", color: "#3a2400", background: `linear-gradient(135deg, ${S.gold2}, ${S.gold})` }}>{n}</div>
                <h3 className="serif" style={{ fontSize: "1.25rem", color: S.gold2, marginBottom: 8, fontWeight: 700 }}>{t}</h3>
                <p style={{ color: S.text2, lineHeight: 1.5 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "56px 22px", background: "rgba(0,0,0,0.18)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "2rem", textAlign: "center", marginBottom: 30, fontWeight: 700 }}>Perguntas comuns</h2>
          {faq.map(([q, a]) => (
            <details key={q} style={{ border: `1px solid ${S.sep}`, borderRadius: 12, marginBottom: 12, background: "rgba(0,0,0,0.15)", padding: "2px 0" }}>
              <summary className="nm-faq-q" style={{ cursor: "pointer", padding: "16px 44px 16px 18px", fontWeight: 600, fontSize: "1.02rem", listStyle: "none", position: "relative" }}>{q}</summary>
              <p style={{ padding: "0 18px 16px", color: S.text2, lineHeight: 1.55 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* OFERTA FINAL */}
      <section style={{ padding: "56px 22px 64px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", background: "linear-gradient(180deg, rgba(61,26,99,0.7), rgba(28,11,46,0.7))", border: `1px solid ${S.gold}`, borderRadius: 22, padding: "40px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
          <div style={{ color: S.gold, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 14, marginBottom: 10 }}>✦ Numerologia</div>
          <div className="serif" style={{ fontSize: "3.2rem", color: "#fff", margin: "6px 0", fontWeight: 700 }}>
            R$45
            <span style={{ display: "block", fontSize: "1rem", color: S.text2, fontWeight: 400 }}>pagamento único • mapa completo em PDF</span>
          </div>
          <a href={CHECKOUT} style={{ ...btnGold, marginTop: 14 }}>✦ {CTA_LABEL}</a>
          <p style={trustStyle}>{TRUST_LINE}</p>
        </div>
      </section>

      <footer style={{ padding: "36px 22px", textAlign: "center", color: S.muted, fontSize: "0.85rem", borderTop: `1px solid ${S.sep}` }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p>A Numerologia da ATB é uma orientação espiritual e reflexiva. Não garante ganhos em jogos, dinheiro ou resultados materiais, e não substitui aconselhamento profissional.</p>
          <p style={{ marginTop: 10 }}>
            © 2026 ATB — Todos os direitos reservados
            {" · "}
            <a href="/privacidade" style={{ color: S.muted, textDecoration: "underline" }}>Privacidade</a>
            {" · "}
            <a href="/termos" style={{ color: S.muted, textDecoration: "underline" }}>Termos</a>
          </p>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        details > summary::-webkit-details-marker { display: none; }
        .nm-faq-q::after {
          content: "+"; position: absolute; right: 16px; top: 50%;
          transform: translateY(-50%); color: #e8b84b; font-size: 1.5rem;
          font-weight: 700; line-height: 1;
        }
        details[open] > .nm-faq-q::after { content: "\\2212"; }
      ` }} />
    </main>
  );
}
