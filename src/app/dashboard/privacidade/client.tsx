"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export function PrivacidadeClient() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/user/me", { method: "GET" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao exportar" }));
        toast.error(err.error || "Erro ao exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atb-meus-dados-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Seus dados foram baixados ✨");
    } catch (e) {
      toast.error("Erro de rede");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (confirmText !== "EXCLUIR") {
      toast.error("Digite EXCLUIR para confirmar");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "EXCLUIR" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao excluir" }));
        toast.error(err.error || "Erro ao excluir conta");
        setDeleting(false);
        return;
      }
      // Faz logout client-side e redireciona
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Conta excluída. Até logo 💛");
      router.push("/");
      router.refresh();
    } catch (e) {
      toast.error("Erro de rede");
      setDeleting(false);
    }
  }

  return (
    <main style={{ padding: "28px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <Link href="/dashboard" style={{ display: "inline-block", color: "#c4b5fd", fontSize: 18, fontWeight: 600, textDecoration: "none", marginBottom: 24, padding: "10px 14px", minHeight: 44 }}>
        ← Voltar ao painel
      </Link>

      <h1 className="serif" style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.2, marginBottom: 14, fontWeight: 700 }}>
        Minha Privacidade
      </h1>
      <p style={{ fontSize: 21, color: "#fbf8ff", lineHeight: 1.55, marginBottom: 36, fontWeight: 500 }}>
        Estes são os seus direitos garantidos pela LGPD. Você pode baixar tudo que temos sobre você ou excluir sua conta a qualquer momento.
      </p>

      {/* Card 1: Baixar meus dados */}
      <section className="card" style={{ padding: "28px 24px", marginBottom: 20, border: "2px solid rgba(232,184,75,0.3)" }}>
        <div style={{ fontSize: 56, marginBottom: 14 }} aria-hidden="true">📦</div>
        <h2 className="serif" style={{ fontSize: "1.6rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
          Baixar meus dados
        </h2>
        <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.6, marginBottom: 22, fontWeight: 500 }}>
          Você recebe um arquivo <strong>JSON</strong> com tudo: suas conversas com ATB, oráculos, diários, leituras, perfil e histórico de compras. Você pode abrir em qualquer editor de texto.
        </p>
        <button
          onClick={exportData}
          disabled={exporting}
          className="btn-gold btn-big"
          style={{
            width: "100%",
            opacity: exporting ? 0.6 : 1,
            cursor: exporting ? "not-allowed" : "pointer",
            border: "none",
            fontSize: 19,
            fontWeight: 800,
          }}
        >
          {exporting ? "Preparando seu arquivo..." : "📥 Baixar meus dados (JSON)"}
        </button>
      </section>

      {/* Card 2: Política de Privacidade */}
      <section className="card" style={{ padding: "28px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 14 }} aria-hidden="true">📜</div>
        <h2 className="serif" style={{ fontSize: "1.6rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
          Ler a política completa
        </h2>
        <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.6, marginBottom: 22, fontWeight: 500 }}>
          Tudo o que coletamos, como usamos, com quem compartilhamos e por quanto tempo guardamos.
        </p>
        <Link
          href="/privacidade"
          style={{
            display: "block",
            textAlign: "center",
            background: "rgba(232,184,75,0.12)",
            color: "#e8b84b",
            border: "1.5px solid rgba(232,184,75,0.4)",
            padding: "20px 24px",
            borderRadius: 12,
            fontSize: 19,
            fontWeight: 700,
            textDecoration: "none",
            minHeight: 64,
          }}
        >
          📜 Ver Política de Privacidade
        </Link>
      </section>

      {/* Card 3: Excluir conta (vermelho, destrutivo) */}
      <section
        style={{
          padding: "28px 24px",
          marginBottom: 20,
          background: "rgba(220,38,38,0.08)",
          border: "2px solid rgba(220,38,38,0.4)",
          borderRadius: 18,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 14 }} aria-hidden="true">🗑️</div>
        <h2 className="serif" style={{ fontSize: "1.6rem", color: "#fca5a5", marginBottom: 12, fontWeight: 700 }}>
          Excluir minha conta
        </h2>
        <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.6, marginBottom: 18, fontWeight: 500 }}>
          Sua conta e todas as conversas serão <strong>excluídas permanentemente</strong>. Registros fiscais (compras) ficam guardados por obrigação legal mas seu nome e e-mail são removidos.
        </p>
        <p style={{ fontSize: 17, color: "#fca5a5", lineHeight: 1.55, marginBottom: 22, fontWeight: 600 }}>
          ⚠️ Esta ação <strong>não pode ser desfeita</strong>.
        </p>

        {!showDeleteForm ? (
          <button
            onClick={() => setShowDeleteForm(true)}
            style={{
              width: "100%",
              background: "rgba(220,38,38,0.15)",
              color: "#fca5a5",
              border: "1.5px solid rgba(220,38,38,0.5)",
              padding: "20px 24px",
              borderRadius: 12,
              fontSize: 19,
              fontWeight: 700,
              cursor: "pointer",
              minHeight: 64,
            }}
          >
            Quero excluir minha conta
          </button>
        ) : (
          <div>
            <label htmlFor="confirm" style={{ display: "block", color: "#fbf8ff", fontSize: 19, fontWeight: 700, marginBottom: 10 }}>
              Digite <strong style={{ color: "#fca5a5" }}>EXCLUIR</strong> para confirmar:
            </label>
            <input
              id="confirm"
              type="text"
              className="input input-big"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="EXCLUIR"
              style={{ marginBottom: 18, fontWeight: 700, letterSpacing: "0.1em" }}
              autoComplete="off"
            />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setShowDeleteForm(false);
                  setConfirmText("");
                }}
                disabled={deleting}
                style={{
                  flex: 1,
                  minWidth: 140,
                  background: "rgba(255,255,255,0.08)",
                  color: "#fbf8ff",
                  border: "1.5px solid rgba(196,181,253,0.3)",
                  padding: "18px 20px",
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 700,
                  cursor: "pointer",
                  minHeight: 64,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting || confirmText !== "EXCLUIR"}
                style={{
                  flex: 1,
                  minWidth: 140,
                  background: confirmText === "EXCLUIR" ? "linear-gradient(135deg,#dc2626,#991b1b)" : "rgba(220,38,38,0.3)",
                  color: "#fff",
                  border: "none",
                  padding: "18px 20px",
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: confirmText === "EXCLUIR" && !deleting ? "pointer" : "not-allowed",
                  opacity: confirmText === "EXCLUIR" && !deleting ? 1 : 0.6,
                  minHeight: 64,
                }}
              >
                {deleting ? "Excluindo..." : "🗑️ Excluir definitivamente"}
              </button>
            </div>
          </div>
        )}
      </section>

      <p style={{ fontSize: 17, color: "#c4b5fd", lineHeight: 1.6, marginTop: 28, textAlign: "center", fontWeight: 500 }}>
        Dúvidas? Escreva para nosso{" "}
        <a href="/privacidade" style={{ color: "#e8b84b", textDecoration: "underline" }}>
          contato de privacidade
        </a>
        .
      </p>
    </main>
  );
}
