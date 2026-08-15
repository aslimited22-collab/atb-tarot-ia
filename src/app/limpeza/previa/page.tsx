"use client";

// Passo 2 + 3 do funil (reforma "valor antes do preço"):
//  - mostra a PRÉVIA (valor entregue) que veio do passo 1 (sessionStorage);
//  - captura o E-MAIL (+ WhatsApp opcional) — aí nasce a order + o lead de
//    remarketing (via /api/limpeza/preview);
//  - só DEPOIS revela a OFERTA (preço R$100 + checkout). O preço nunca aparece
//    antes do valor. Reforço de confiança SEM promessa de reembolso.
// BR-focado (funil do anúncio), PT-hardcoded — igual à /limpeza-espiritual.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatMoney } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locales";

type Step1 = { name: string; theme: string; question: string; previewText: string };
type Checkout = { orderId: string; checkoutUrl: string; price: number; currency: string };

const S = {
  bg: "#120025", gold: "#e8b84b", gold2: "#f5c860", text: "#fbf8ff", text2: "#c4b5fd", muted: "#9575cd",
};

const INCLUIDO = [
  "🕯️ Uma limpeza espiritual personalizada, feita a partir do que você escreveu",
  "🙏 Uma oração dedicada ao seu nome, com a proteção dos santos",
  "🌿 Uma orientação simples do que fazer depois pra manter a sua paz",
  "📱 Tudo no seu celular, com sigilo total",
];

export default function PreviaPage() {
  const router = useRouter();
  const { locale } = useT();
  const [data, setData] = useState<Step1 | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("limpeza_v2_previa");
      if (raw) {
        const parsed = JSON.parse(raw) as Step1;
        if (parsed?.previewText && parsed?.name) {
          setData(parsed);
          setReady(true);
          return;
        }
      }
    } catch {}
    // Sem dados (acesso direto / recarregou) → volta pro passo 1.
    router.replace("/limpeza");
  }, [router]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function captureEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !emailValid || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/limpeza/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: email.trim(),
          phone: phone.trim() || null,
          theme: data.theme,
          question: data.question,
          previewText: data.previewText, // não regenera a prévia
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.checkoutUrl) {
        toast.error(d.error || "Não consegui preparar sua oferta agora. Tente de novo.");
        setSubmitting(false);
        return;
      }
      setCheckout({ orderId: d.orderId, checkoutUrl: d.checkoutUrl, price: d.price, currency: d.currency || "BRL" });
    } catch {
      toast.error("Falha de conexão. Tente de novo.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <main style={{ background: S.bg, color: S.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ color: S.text2 }}>Carregando sua prévia...</p>
      </main>
    );
  }

  const firstName = (data!.name || "").split(" ")[0];
  const priceLabel = checkout ? formatMoney(checkout.price, checkout.currency, locale as Locale) : "";

  return (
    <main style={{ background: S.bg, color: S.text, minHeight: "100vh", padding: "40px 20px 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* PRÉVIA (valor entregue) */}
        <div style={{ fontSize: 14, color: S.gold, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>
          ✨ Sua prévia espiritual
        </div>
        <div className="card-gold" style={{ padding: "26px 22px", marginBottom: 26 }}>
          <p style={{ fontSize: 18, color: S.gold2, fontWeight: 700, marginBottom: 12 }}>
            {firstName}, preparei isto com carinho pra você 🕯️
          </p>
          <p style={{ fontSize: 19, color: S.text, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap", fontWeight: 500 }}>
            {data!.previewText}
          </p>
        </div>

        {/* PASSO 2 — captura de e-mail (só enquanto a oferta não foi revelada) */}
        {!checkout && (
          <form onSubmit={captureEmail} className="card" style={{ padding: "26px 22px" }}>
            <p style={{ fontSize: 18, color: S.text, lineHeight: 1.6, marginBottom: 6, fontWeight: 500 }}>
              Essa é só a <b style={{ color: S.gold2 }}>primeira parte</b>. Sua orientação completa — com a oração feita pro seu caso e o passo a passo pra manter sua paz — eu preparo e envio pra você.
            </p>
            <p style={{ fontSize: 17, color: S.text2, marginBottom: 18, fontWeight: 500 }}>
              Me diga seu melhor e-mail pra receber:
            </p>
            <input
              type="email"
              className="input input-big"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              style={{ marginBottom: 14 }}
            />
            <input
              type="tel"
              className="input input-big"
              placeholder="WhatsApp (opcional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
              maxLength={20}
              style={{ marginBottom: 18 }}
            />
            <button
              type="submit"
              disabled={!emailValid || submitting}
              className="btn-gold btn-big"
              style={{ width: "100%", border: "none", opacity: !emailValid || submitting ? 0.55 : 1, cursor: !emailValid || submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? "Preparando..." : "Receber minha orientação"}
            </button>
            <p style={{ fontSize: 14, color: S.muted, textAlign: "center", marginTop: 12, fontStyle: "italic", lineHeight: 1.5 }}>
              🔒 Seu e-mail fica seguro. Nada de spam — só a sua orientação.
            </p>
          </form>
        )}

        {/* PASSO 3 — oferta (revelada só depois do e-mail; preço aparece aqui) */}
        {checkout && (
          <div className="card-gold" style={{ padding: "30px 24px", border: `1px solid ${S.gold}` }}>
            <h2 className="serif" style={{ fontSize: "1.7rem", color: S.gold, marginBottom: 16, fontWeight: 700, lineHeight: 1.2 }}>
              Sua Limpeza Espiritual completa, feita pro seu caso
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", display: "grid", gap: 12 }}>
              {INCLUIDO.map((txt, i) => (
                <li key={i} style={{ fontSize: 18, color: S.text, lineHeight: 1.5, fontWeight: 500 }}>{txt}</li>
              ))}
            </ul>

            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div className="serif" style={{ fontSize: "2.8rem", color: "#fff", fontWeight: 700, lineHeight: 1 }}>
                {priceLabel}
              </div>
              <div style={{ fontSize: 15, color: S.gold2, fontWeight: 600, marginTop: 4 }}>
                pagamento único · Pix ou cartão · sem mensalidade
              </div>
            </div>

            <a
              href={checkout.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold btn-big"
              style={{ display: "block", textAlign: "center", textDecoration: "none", width: "100%", border: "none" }}
            >
              Quero minha Limpeza completa — {priceLabel}
            </a>

            <p style={{ fontSize: 14, color: S.text2, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
              🔒 Pagamento 100% seguro · 💬 Se quiser, fale comigo no WhatsApp antes de pagar — sem pressa.
            </p>

            {/* Prova social ao lado do preço */}
            <div style={{ marginTop: 22, padding: "18px 18px", background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${S.gold}`, borderRadius: 12 }}>
              <p style={{ fontStyle: "italic", color: "#efe7fb", lineHeight: 1.55, fontSize: 16 }}>
                “Eu tava com o coração pesado fazia meses. Depois da limpeza com a ATB, respirei de novo.”
              </p>
              <div style={{ marginTop: 8, color: S.gold2, fontWeight: 700, fontSize: 14 }}>— Marina S.</div>
            </div>
            <p style={{ fontSize: 15, color: S.text2, textAlign: "center", marginTop: 14, fontWeight: 600 }}>
              📢 +1 milhão de pessoas acompanham a ATB por mês.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
