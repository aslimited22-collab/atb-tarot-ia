"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Spinner pós-pagamento que faz poll pra confirmar que webhook processou.
// Evita tela em branco quando webhook atrasa (cliente 60+ se assusta e contacta WhatsApp).
//
// Uso: <PurchaseWaitSpinner email={email}>{conteudoNormal}</PurchaseWaitSpinner>
// Enquanto webhook não processou, mostra spinner.
// Após 30s sem achar, mostra fallback com WhatsApp.
// Após achar, renderiza children.

type Props = {
  email: string | null;
  /** Conteúdo pós-confirmação (renderizado quando purchase é encontrada) */
  children: React.ReactNode;
  /** WhatsApp pra fallback (default: env NEXT_PUBLIC_WHATSAPP_NUMBER) */
  whatsappNumber?: string;
  /** Pula o spinner (se já temos certeza que webhook processou) */
  skip?: boolean;
};

const MAX_WAIT_SECONDS = 30;
const POLL_INTERVAL_MS = 2000;

export default function PurchaseWaitSpinner({ email, children, whatsappNumber, skip }: Props) {
  const router = useRouter();
  const [found, setFound] = useState(skip || false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (found || skip || !email) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/purchases/check?email=${encodeURIComponent(email!)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.found) {
          setFound(true);
          // Trigger server component re-render pra pegar novo estado da purchase
          router.refresh();
        }
      } catch {
        // network glitch — tenta de novo no próximo intervalo
      }
    }

    poll(); // tenta imediato
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const ticker = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(ticker);
    };
  }, [email, found, skip, router]);

  if (found || skip) {
    return <>{children}</>;
  }

  const timeoutReached = secondsElapsed >= MAX_WAIT_SECONDS;
  const wa = whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5511999999999";
  const waLink = `https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent("Oi! Acabei de pagar mas o acesso não apareceu. Email: " + (email || "(não informado)"))}`;

  return (
    <div style={{
      minHeight: "70vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
    }}>
      {/* Spinner dourado */}
      <div style={{
        width: 80,
        height: 80,
        border: "6px solid rgba(232,184,75,0.25)",
        borderTopColor: "#e8b84b",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: 32,
      }} aria-hidden="true" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {!timeoutReached ? (
        <>
          <h2 style={{
            fontFamily: "Georgia, serif",
            fontSize: "1.8rem",
            color: "#e8b84b",
            margin: "0 0 12px",
            lineHeight: 1.25,
            fontWeight: 700,
          }}>
            Preparando seu acesso…
          </h2>
          <p style={{
            fontSize: 18,
            color: "#fbf8ff",
            lineHeight: 1.6,
            margin: "0 0 8px",
            maxWidth: 480,
            fontWeight: 500,
          }}>
            Aguarde alguns segundos enquanto confirmamos seu pagamento.
          </p>
          <p style={{
            fontSize: 14,
            color: "#c4b5fd",
            margin: 0,
            fontVariantNumeric: "tabular-nums",
          }}>
            {Math.max(0, MAX_WAIT_SECONDS - secondsElapsed)}s restantes
          </p>
        </>
      ) : (
        <>
          <h2 style={{
            fontFamily: "Georgia, serif",
            fontSize: "1.7rem",
            color: "#e8b84b",
            margin: "0 0 12px",
            lineHeight: 1.25,
            fontWeight: 700,
          }}>
            Ainda processando…
          </h2>
          <p style={{
            fontSize: 17,
            color: "#fbf8ff",
            lineHeight: 1.65,
            margin: "0 0 28px",
            maxWidth: 500,
            fontWeight: 500,
          }}>
            Seu pagamento foi aprovado e estamos preparando tudo. Você receberá um email em até 5 minutos com o acesso.<br/><br/>
            Se preferir, fale com a gente agora:
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #25D366, #128C7E)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 18,
              padding: "18px 32px",
              borderRadius: 12,
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(37,211,102,0.4)",
            }}
          >
            💬 Falar no WhatsApp
          </a>
        </>
      )}
    </div>
  );
}
