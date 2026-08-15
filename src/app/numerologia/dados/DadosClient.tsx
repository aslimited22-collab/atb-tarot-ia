"use client";

// Form pós-compra da Numerologia (molde PersonalMapForm + previa/page):
// 1) resolve o pedido por token (poll — webhook pode levar alguns segundos);
// 2) coleta nome completo + data de nascimento;
// 3) POST /api/numerologia/dados → entrega na hora (PDF no e-mail).
// PT-hardcoded (funil BR-first). Público 45+: textos grandes, 1 coluna.

import { useCallback, useEffect, useRef, useState } from "react";

const S = {
  gold: "#e8b84b",
  gold2: "#f6d67e",
  text: "#f5f0ff",
  text2: "#c4b5fd",
  muted: "#9575cd",
};

// Suporte no beco sem saída (público 45+): link de WhatsApp se o número existir
// no build (NEXT_PUBLIC_ é inlined em client components).
const WA_PHONE = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").trim();
const WA_HREF = WA_PHONE
  ? `https://wa.me/${WA_PHONE}?text=${encodeURIComponent("Oi! Comprei a Numerologia e preciso de ajuda com o meu pedido.")}`
  : "";

type Phase = "resolving" | "not_found" | "form" | "submitting" | "done" | "already";

export default function DadosClient({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>(token ? "resolving" : "not_found");
  const [orderId, setOrderId] = useState<string>("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [delivered, setDelivered] = useState(false);
  const attemptsRef = useRef(0);

  const resolveOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/numerologia/pedido?token=${encodeURIComponent(token)}`);
      const d = await res.json().catch(() => ({}));
      if (d?.found && d?.paid) {
        setOrderId(d.orderId);
        setPhase(d.needsData ? "form" : "already");
        return true;
      }
    } catch {
      // segue no poll
    }
    return false;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const ok = await resolveOrder();
      if (ok || cancelled) return;
      attemptsRef.current += 1;
      if (attemptsRef.current >= 30) {
        // ~2min sem achar: o webhook não chegou (ou token inválido)
        setPhase("not_found");
        return;
      }
      setTimeout(tick, 4000);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [token, resolveOrder]);

  const today = new Date().toISOString().slice(0, 10);
  const nameOk = name.trim().length >= 5 && name.trim().includes(" ");
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(birthDate);

  async function submit() {
    if (!nameOk || !dateOk || phase === "submitting") return;
    setError("");
    setPhase("submitting");
    try {
      const res = await fetch("/api/numerologia/dados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, full_name: name.trim(), birth_date: birthDate }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d?.error || "Não conseguimos salvar. Tente de novo.");
        setPhase("form");
        return;
      }
      setDelivered(!!d?.delivered);
      setPhase("done");
    } catch {
      setError("Falha de conexão. Verifique sua internet e tente de novo.");
      setPhase("form");
    }
  }

  return (
    <main style={{ background: "#120025", color: S.text, minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span className="serif" style={{ color: S.gold, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.28em" }}>ATB</span>
        </div>

        <div className="card-gold" style={{ padding: "32px 24px", textAlign: "center" }}>
          {phase === "resolving" && (
            <>
              <div className="num-spin" style={{ fontSize: 48, marginBottom: 12, display: "inline-block" }} aria-hidden="true">🕊️</div>
              <h1 className="serif" style={{ fontSize: "1.6rem", color: S.gold2, marginBottom: 10 }}>
                Confirmando seu pagamento<span className="num-dots" aria-hidden="true" />
              </h1>
              <p style={{ color: S.text2, lineHeight: 1.6 }}>
                Pode levar até 2 minutos se o banco demorar. Não feche esta página.
              </p>
            </>
          )}

          {phase === "not_found" && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🔎</div>
              <h1 className="serif" style={{ fontSize: "1.5rem", color: S.gold2, marginBottom: 10 }}>Não encontramos seu pedido ainda</h1>
              <p style={{ color: S.text2, lineHeight: 1.65, marginBottom: 20 }}>
                Se você acabou de pagar, espere 1 minuto e toque no botão abaixo.
                Também enviamos o link certo pro seu e-mail de compra — procure por
                <b style={{ color: S.gold2 }}> &quot;Numerologia&quot;</b> (olhe o spam).
              </p>
              <button
                type="button"
                className="btn-gold btn-big"
                onClick={() => window.location.reload()}
                style={{ width: "100%", border: "none", cursor: "pointer" }}
              >
                🔄 Tentar de novo
              </button>
              {WA_HREF && (
                <p style={{ marginTop: 16, fontSize: "0.9rem" }}>
                  <a href={WA_HREF} target="_blank" rel="noopener noreferrer" style={{ color: S.muted, textDecoration: "underline" }}>
                    Precisa de ajuda? Fale com a gente no WhatsApp
                  </a>
                </p>
              )}
            </>
          )}

          {(phase === "form" || phase === "submitting") && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🔢</div>
              <h1 className="serif" style={{ fontSize: "1.6rem", color: S.gold2, marginBottom: 8 }}>Pagamento confirmado! ✅</h1>
              <p style={{ color: S.text2, lineHeight: 1.6, marginBottom: 24 }}>
                Agora a ATB precisa de 2 informações pra calcular os seus números:
              </p>

              <div style={{ textAlign: "left" }}>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: S.text }}>
                  Seu nome completo
                </label>
                <input
                  className="input input-big"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Maria Aparecida da Silva"
                  autoComplete="name"
                  maxLength={120}
                  style={{ width: "100%", marginBottom: 4 }}
                />
                <p style={{ fontSize: "0.85rem", color: S.muted, margin: "0 0 18px" }}>
                  Do jeito que está nos seus documentos — o cálculo usa cada letra.
                </p>

                <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: S.text }}>
                  Sua data de nascimento
                </label>
                <input
                  className="input input-big"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  min="1900-01-01"
                  max={today}
                  style={{ width: "100%", marginBottom: 20 }}
                />
              </div>

              {error && (
                <p style={{ color: "#ff9d9d", fontSize: "0.95rem", marginBottom: 14, lineHeight: 1.5 }}>{error}</p>
              )}

              <button
                type="button"
                className="btn-gold btn-big"
                onClick={submit}
                disabled={!nameOk || !dateOk || phase === "submitting"}
                style={{ width: "100%", opacity: !nameOk || !dateOk ? 0.55 : 1, border: "none", cursor: "pointer" }}
              >
                {phase === "submitting" ? "A ATB está preparando seu mapa…" : "✨ Receber meu mapa em PDF"}
              </button>
              <p style={{ fontSize: "0.85rem", color: S.muted, marginTop: 12 }}>
                {phase === "submitting"
                  ? "Isso leva menos de 1 minuto. Não feche esta página."
                  : "Seu mapa chega no e-mail que você usou na compra."}
              </p>
            </>
          )}

          {phase === "done" && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">💌</div>
              <h1 className="serif" style={{ fontSize: "1.6rem", color: S.gold2, marginBottom: 10 }}>
                {delivered ? "Seu mapa foi enviado!" : "Dados recebidos!"}
              </h1>
              <p style={{ color: S.text2, lineHeight: 1.65, marginBottom: 18 }}>
                {delivered
                  ? "Olhe o seu e-mail: seu mapa de Numerologia chegou em PDF (confira também o spam)."
                  : "A ATB está preparando o seu mapa. Ele chega em PDF no seu e-mail em até 24h — normalmente em poucos minutos."}
              </p>
              {/* Botão só quando a entrega CONFIRMOU — senão o clique cai num 409
                  "ainda preparando" e contradiz o "chega em até 24h" acima. */}
              {orderId && delivered && (
                <a
                  href={`/numerologia/download/${orderId}`}
                  className="btn-gold"
                  style={{ display: "inline-block", padding: "14px 26px", textDecoration: "none" }}
                >
                  📥 Baixar meu PDF agora
                </a>
              )}
            </>
          )}

          {phase === "already" && (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">💌</div>
              <h1 className="serif" style={{ fontSize: "1.6rem", color: S.gold2, marginBottom: 10 }}>Já recebemos seus dados!</h1>
              <p style={{ color: S.text2, lineHeight: 1.65, marginBottom: 18 }}>
                Seu mapa está no seu e-mail (confira o spam). Se quiser, baixe de novo:
              </p>
              {orderId && (
                <a
                  href={`/numerologia/download/${orderId}`}
                  className="btn-gold"
                  style={{ display: "inline-block", padding: "14px 26px", textDecoration: "none" }}
                >
                  📥 Baixar meu PDF
                </a>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign: "center", color: S.muted, fontSize: "0.8rem", marginTop: 24, lineHeight: 1.6 }}>
          Orientação espiritual e reflexiva — não substitui aconselhamento profissional.<br />
          ATB · atbtartot.com
        </p>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes num-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .num-spin { animation: num-float 1.6s ease-in-out infinite; }
        @keyframes num-ellipsis { 0% { content: "" } 25% { content: "." } 50% { content: ".." } 75% { content: "..." } }
        .num-dots::after { content: "..."; animation: num-ellipsis 1.6s steps(1) infinite; }
      ` }} />
    </main>
  );
}
