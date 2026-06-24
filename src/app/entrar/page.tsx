"use client";

// Página intermediária do magic-link (ver src/lib/magic-entry.ts).
// O botão do e-mail abre AQUI. Esta página NÃO faz login ao carregar — só no
// clique humano do botão (navegação via JS, sem <a href> com o token), pra que
// scanners de e-mail que pré-abrem o link não "queimem" o magic-link de uso único.
//
// O destino (`dest`) só é aceito se apontar pro próprio Supabase Auth do projeto
// (trava anti-open-redirect) — ninguém usa /entrar pra redirecionar pra fora.

import { useEffect, useState } from "react";

export default function EntrarPage() {
  const [dest, setDest] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [going, setGoing] = useState(false);

  useEffect(() => {
    try {
      const d = new URLSearchParams(window.location.search).get("dest") || "";
      const supa = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
      const origin = window.location.origin;
      // Anti-open-redirect. Aceita só: (a) /auth/callback do PRÓPRIO site (fluxo
      // token_hash, novo) ou (b) o Supabase Auth do projeto (legado action_link).
      const ok = !!d && (
        d.startsWith(`${origin}/auth/`) ||
        (!!supa && d.startsWith(supa))
      );
      setDest(ok ? d : null);
    } catch {
      setDest(null);
    }
    setReady(true);
  }, []);

  function enter() {
    if (!dest) return;
    setGoing(true);
    window.location.href = dest;
  }

  const card: React.CSSProperties = {
    maxWidth: 480,
    margin: "0 auto",
    background: "linear-gradient(135deg,#1e0040 0%,#2a0055 50%,#1e0040 100%)",
    border: "2px solid rgba(232,184,75,0.5)",
    borderRadius: 20,
    padding: "44px 30px",
    textAlign: "center",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#120025",
        color: "#fbf8ff",
        fontFamily: "Georgia, serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={card}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🕯️</div>

        {!ready ? (
          <p style={{ color: "#c4b5fd" }}>Carregando…</p>
        ) : dest ? (
          <>
            <h1 style={{ color: "#e8b84b", fontSize: 28, margin: "0 0 10px", lineHeight: 1.2 }}>
              Você está a um toque
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, margin: "0 0 28px", fontWeight: 500 }}>
              Toque no botão abaixo para entrar na sua conta com segurança.
            </p>
            <button
              onClick={enter}
              disabled={going}
              style={{
                display: "inline-block",
                background: going ? "#c9a94a" : "linear-gradient(135deg,#e8b84b,#c9950a)",
                color: "#120025",
                fontWeight: 800,
                fontSize: 21,
                padding: "20px 40px",
                borderRadius: 14,
                border: "none",
                cursor: going ? "wait" : "pointer",
                boxShadow: "0 8px 24px rgba(232,184,75,0.4)",
                width: "100%",
                maxWidth: 360,
              }}
            >
              {going ? "Entrando…" : "✨ Entrar agora"}
            </button>
            <p style={{ color: "#9575cd", fontSize: 13, margin: "20px 0 0", lineHeight: 1.5 }}>
              Sem senha. Você entra direto, com segurança.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ color: "#e8b84b", fontSize: 26, margin: "0 0 10px" }}>Link inválido</h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, margin: "0 0 24px" }}>
              Este link de acesso não é válido ou já foi usado. Peça um novo no botão abaixo.
            </p>
            <a
              href="/login"
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg,#e8b84b,#c9950a)",
                color: "#120025",
                fontWeight: 800,
                fontSize: 18,
                padding: "16px 32px",
                borderRadius: 14,
                textDecoration: "none",
              }}
            >
              Pedir novo acesso
            </a>
          </>
        )}
      </div>
    </div>
  );
}
