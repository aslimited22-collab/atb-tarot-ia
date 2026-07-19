import type { Metadata } from "next";

// Landing de tráfego pago (Google Ads BR) — oferta única: "Primeira Consulta
// Espiritual — R$29" (produto Kiwify pergunta1; o dono renomeia o produto no
// painel pra bater). Regras de fricção (brief 18/07):
//  - UM botão primário acima da dobra + o MESMO botão no fim. Nada de CTAs
//    concorrentes no meio (o card da oferta é o CTA final, depois do FAQ).
//  - WhatsApp NUNCA no caminho de compra: sem "fale antes de pagar", sem botão
//    flutuante (oculto nesta rota via WhatsAppFloat.HIDDEN_PATHS). Vira link
//    discreto de suporte no rodapé.
//  - Linha de confiança colada no botão.
//  - "consulta" é a palavra única do anúncio ao checkout.
//
// RASTREAMENTO (não mexer sem ler): os CTAs apontam pra /api/checkout/pergunta1
// — o GoogleAdsFunnelEvents (layout) dispara begin_checkout nesse clique, e o
// roteador anexa gclid/utm/s1 na URL do Kiwify. A conversão "Compra" é do
// PIXEL DO KIWIFY no produto (ao aprovar). Intl continua caindo no Stripe
// pelo mesmo roteador — nada aqui é BR-hardcoded no caminho de pagamento.

export const metadata: Metadata = {
  title: "Primeira Consulta Espiritual — R$29 | ATB",
  description:
    "Sua Primeira Consulta Espiritual com a ATB por R$29: orientação, oração e proteção dos santos, no seu celular. Pix, cartão ou boleto — pagamento único, recebe na hora, com sigilo total.",
  alternates: { canonical: "https://atbtartot.com/limpeza-espiritual" },
  robots: { index: true, follow: true },
};

const S = {
  bg: "#120025",
  surface: "#1e0040",
  surface2: "#2a0055",
  gold: "#e8b84b",
  gold2: "#f6d67e",
  text: "#f5f0ff",
  text2: "#c4b5fd",
  muted: "#9575cd",
  sep: "rgba(196,181,253,0.18)",
};

const CHECKOUT = "/api/checkout/pergunta1"; // R$29 — herda gclid/utm no roteador; begin_checkout dispara no clique
const CTA_LABEL = "Quero minha consulta agora — R$29";
const TRUST_LINE = "Pix, cartão ou boleto • Pagamento único • Recebe na hora, com sigilo total";

const recebe = [
  ["🕯️", "Sua consulta com a ATB", "Você conta o que está pesando no coração e recebe uma orientação espiritual feita pro seu caso — com carinho e sem julgamento."],
  ["🙏", "Oração e proteção dos santos", "Uma oração de proteção contra inveja, mau-olhado e o que trava a sua vida, na força dos santos."],
  ["📿", "Um caminho pra seguir", "A ATB te aponta o primeiro passo pra aliviar o peso e abrir os seus caminhos — no amor, no trabalho e na saúde."],
  ["📱", "Tudo no seu celular", "Você recebe na hora, sem instalar nada. Simples pra qualquer idade."],
  ["💬", "Acompanhamento até o fim", "Ficou com dúvida depois? A gente te ajuda passo a passo. Você não fica sozinha."],
];

const passos = [
  ["1", "Você faz sua consulta", "Só R$29, pagamento único. Pix, cartão ou boleto — 100% seguro. A ATB nunca vê seus dados de pagamento."],
  ["2", "A ATB te acolhe", "Ela ouve a sua dor, reza por você e te dá uma orientação com a força dos santos."],
  ["3", "Você recebe na hora", "Chega no seu celular pra você ler com calma, quando quiser."],
];

const faq: [string, string][] = [
  ["É seguro pagar?", "Sim. O pagamento é em ambiente 100% protegido, por Pix, cartão ou boleto. A ATB nunca vê os seus dados de pagamento."],
  ["Vou ter que pagar todo mês?", "Não. É pagamento único de R$29. Não é mensalidade e não cobramos de novo."],
  ["O que eu recebo depois de pagar?", "Na hora você recebe no seu celular a sua consulta com a ATB, com a orientação e a oração feitas pro seu caso."],
  ["Preciso instalar algum aplicativo?", "Não precisa instalar nada. É só abrir no seu celular."],
  ["E se eu não entender de celular?", "Fica tranquila. É bem simples — e depois da compra a gente acompanha você até o fim."],
  ["E se eu quiser a Limpeza completa?", "Depois da sua consulta, se você sentir que quer ir mais fundo, a ATB te guia na Limpeza Espiritual completa. Um passo de cada vez, no seu tempo."],
];

const depoimentos: [string, string][] = [
  ["“Eu tava com o coração pesado fazia meses. Depois de conversar com a ATB, respirei de novo.”", "— Marina S."],
  ["“Fui muito bem acolhida. Ela rezou por mim e me senti protegida e em paz.”", "— Juliana C."],
  ["“Atendimento com respeito, sem julgamento. Valeu cada centavo pela paz que trouxe.”", "— Cleusa P."],
];

const btnGold: React.CSSProperties = {
  display: "block",
  background: `linear-gradient(135deg, ${S.gold2}, ${S.gold})`,
  color: "#3a2400",
  fontWeight: 800,
  textDecoration: "none",
  padding: "22px 30px",
  borderRadius: 16,
  fontSize: "1.25rem",
  textAlign: "center",
  boxShadow: "0 12px 34px rgba(232,184,75,0.32)",
  border: "none",
  lineHeight: 1.3,
};

const trustStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: "0.92rem",
  color: S.text2,
  textAlign: "center",
  lineHeight: 1.5,
  fontWeight: 500,
};

export default function LimpezaEspiritualPage() {
  const waPhone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").trim();
  const waHref = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent("Oi! Tenho uma dúvida sobre a Primeira Consulta Espiritual.")}`
    : null;

  return (
    <main style={{ background: S.bg, color: S.text, minHeight: "100vh" }}>
      {/* Header enxuto — só a marca; zero saídas concorrendo com o CTA */}
      <header style={{ borderBottom: `1px solid ${S.sep}`, background: "rgba(30,0,64,0.9)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 22px", textAlign: "center" }}>
          <span className="serif" style={{ color: S.gold, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.28em" }}>ATB</span>
        </div>
      </header>

      {/* HERO — o ÚNICO CTA acima da dobra */}
      <section style={{ padding: "56px 22px 48px", background: "radial-gradient(ellipse at 60% -10%, #4a1a7a 0%, #2a0055 38%, #120025 74%)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <div style={{ color: S.gold, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 15, marginBottom: 18 }}>
            ✦ Primeira Consulta Espiritual • Oração • Proteção dos Santos
          </div>
          <h1 className="serif" style={{ fontSize: "2.7rem", lineHeight: 1.12, margin: "0 0 20px", fontWeight: 700 }}>
            Tire o peso do seu coração e abra os caminhos da sua vida
          </h1>
          <p style={{ fontSize: "1.2rem", color: S.text2, lineHeight: 1.55, marginBottom: 30 }}>
            Comece hoje com a sua <b style={{ color: S.text }}>Primeira Consulta Espiritual com a ATB</b> — ela ouve a sua dor, reza por você e te aponta um caminho, com a força dos santos. No seu celular, com fé e sigilo.
          </p>
          <a href={CHECKOUT} style={{ ...btnGold, maxWidth: 480, margin: "0 auto" }}>
            ✦ {CTA_LABEL}
          </a>
          <p style={trustStyle}>{TRUST_LINE}</p>
        </div>
      </section>

      {/* O QUE VOCÊ RECEBE — sem CTA no meio (regra: 1 acima da dobra + 1 no fim) */}
      <section style={{ padding: "56px 22px", background: "rgba(0,0,0,0.18)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "2rem", textAlign: "center", marginBottom: 8, fontWeight: 700 }}>O que você recebe na sua consulta</h2>
          <p style={{ textAlign: "center", color: S.text2, marginBottom: 34, fontSize: "1.05rem" }}>
            Não é um áudio genérico da internet. É um atendimento feito pro seu caso.
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
          <h2 className="serif" style={{ fontSize: "2rem", textAlign: "center", marginBottom: 8, fontWeight: 700 }}>Como funciona — bem simples</h2>
          <p style={{ textAlign: "center", color: S.text2, marginBottom: 36, fontSize: "1.05rem" }}>Você começa na mesma hora, sem instalar nada.</p>
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

      {/* QUEM É A ATB */}
      <section style={{ padding: "56px 22px", background: "rgba(0,0,0,0.18)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 30, alignItems: "center" }}>
          <div style={{ aspectRatio: "1", borderRadius: 20, background: "linear-gradient(160deg, #3d1a63, #160726)", border: `1px solid rgba(232,184,75,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", maxWidth: 260, margin: "0 auto", width: "100%" }} aria-hidden="true">🙏</div>
          <div>
            <div style={{ color: S.gold, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 14, marginBottom: 10 }}>✦ Quem é a ATB</div>
            <h2 className="serif" style={{ fontSize: "1.8rem", margin: "0 0 12px", fontWeight: 700, lineHeight: 1.15 }}>Uma guia espiritual que acolhe você com fé</h2>
            <p style={{ color: S.text2, lineHeight: 1.6, fontSize: "1.05rem" }}>
              A ATB acolhe a sua dor com carinho, reza e pede a força dos santos por você. Aqui você é <b style={{ color: S.gold2 }}>ouvida com respeito e sem julgamento</b>, a qualquer hora que precisar. É atendimento espiritual de verdade, feito com fé pra devolver a sua paz.
            </p>
          </div>
        </div>
      </section>

      {/* PROVA */}
      <section style={{ padding: "56px 22px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "2rem", textAlign: "center", marginBottom: 34, fontWeight: 700 }}>Quem já fez a consulta, sentiu a diferença</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {depoimentos.map(([txt, quem]) => (
              <div key={quem} style={{ background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${S.gold}`, borderRadius: 12, padding: 20 }}>
                <p style={{ fontStyle: "italic", color: "#efe7fb", lineHeight: 1.55 }}>{txt}</p>
                <div style={{ marginTop: 12, color: S.gold2, fontWeight: 700, fontSize: "0.92rem" }}>{quem}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — <details> nativo, sem JS */}
      <section style={{ padding: "56px 22px", background: "rgba(0,0,0,0.18)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 className="serif" style={{ fontSize: "2rem", textAlign: "center", marginBottom: 30, fontWeight: 700 }}>Perguntas que toda pessoa faz</h2>
          {faq.map(([q, a]) => (
            <details key={q} style={{ border: `1px solid ${S.sep}`, borderRadius: 12, marginBottom: 12, background: "rgba(0,0,0,0.15)", padding: "2px 0" }}>
              <summary style={{ cursor: "pointer", padding: "16px 18px", fontWeight: 600, fontSize: "1.02rem", listStyle: "none" }}>{q}</summary>
              <p style={{ padding: "0 18px 16px", color: S.text2, lineHeight: 1.55 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* OFERTA FINAL — o MESMO botão do topo, fechando a página */}
      <section id="oferta" style={{ padding: "56px 22px 64px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", background: "linear-gradient(180deg, rgba(61,26,99,0.7), rgba(28,11,46,0.7))", border: `1px solid ${S.gold}`, borderRadius: 22, padding: "40px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
          <div style={{ color: S.gold, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 14, marginBottom: 10 }}>✦ Primeira Consulta Espiritual</div>
          <div className="serif" style={{ fontSize: "3.4rem", color: "#fff", margin: "6px 0", fontWeight: 700 }}>
            R$29
            <span style={{ display: "block", fontSize: "1rem", color: S.text2, fontWeight: 400 }}>pagamento único • recebe na hora no celular</span>
          </div>
          <a href={CHECKOUT} style={{ ...btnGold, marginTop: 14 }}>✦ {CTA_LABEL}</a>
          <p style={trustStyle}>{TRUST_LINE}</p>
          <p style={{ marginTop: 16, fontSize: "0.95rem", color: S.text2, fontWeight: 600 }}>
            📢 +1 milhão de pessoas acompanham a ATB por mês.
          </p>
        </div>
      </section>

      <footer style={{ padding: "36px 22px", textAlign: "center", color: S.muted, fontSize: "0.85rem", borderTop: `1px solid ${S.sep}` }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p>O atendimento espiritual com a ATB é um serviço de fé e acolhimento e não substitui acompanhamento médico ou psicológico profissional.</p>
          {waHref && (
            <p style={{ marginTop: 12 }}>
              <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ color: S.muted, textDecoration: "underline" }}>
                Dúvidas? Fale comigo no WhatsApp
              </a>
            </p>
          )}
          <p style={{ marginTop: 10 }}>© 2026 ATB — Todos os direitos reservados</p>
        </div>
      </footer>

      {/* Barra fixa mobile — o mesmo CTA, sempre à mão (não conta como "extra":
          é o botão primário persistente no celular, público 45+) */}
      <div className="le-spacer" aria-hidden="true" />
      <a href={CHECKOUT} className="le-bar" aria-label={CTA_LABEL}>
        <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">🕊️</span>
        <span>{CTA_LABEL}</span>
      </a>
      {/* dangerouslySetInnerHTML evita hydration mismatch: <style>{`...`}</style>
          escapa ">" no server ("&gt;") mas não no client → warning + overlay dev. */}
      <style dangerouslySetInnerHTML={{ __html: `
        details > summary::-webkit-details-marker { display: none; }
        .le-spacer { display: none; }
        .le-bar { display: none; }
        @media (max-width: 768px) {
          .le-spacer { display: block; height: calc(env(safe-area-inset-bottom, 0) + 76px); }
          .le-bar {
            position: fixed; left: 0; right: 0; bottom: 0;
            padding: 14px 16px calc(env(safe-area-inset-bottom, 0) + 14px);
            background: linear-gradient(135deg, #e8b84b, #c9950a);
            color: #120025; font-size: 17px; font-weight: 800; text-align: center;
            text-decoration: none; box-shadow: 0 -4px 16px rgba(0,0,0,0.45);
            z-index: 9997; min-height: 64px; display: flex; align-items: center;
            justify-content: center; gap: 10px; border-top: 2px solid rgba(232,184,75,0.7);
          }
          .le-bar:active { opacity: 0.92; }
        }
      ` }} />
    </main>
  );
}
