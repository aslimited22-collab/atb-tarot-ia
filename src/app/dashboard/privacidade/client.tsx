"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";

export function PrivacidadeClient() {
  const router = useRouter();
  const { t } = useT();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  // Palavra-chave de confirmação localizada (EXCLUIR / DELETE / ELIMINAR / ...).
  // O backend /api/user/me sempre recebe "EXCLUIR" (contrato fixo) — o cliente
  // digita na sua língua, mas enviamos o token interno esperado pela API.
  const KEYWORD = t("privacy.delete_keyword");

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/user/me", { method: "GET" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: t("privacy.export_toast_err") }));
        toast.error(err.error || t("privacy.export_toast_err"));
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
      toast.success(t("privacy.export_toast_ok"));
    } catch (e) {
      toast.error(t("forgot.toast_network"));
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (confirmText !== KEYWORD) {
      toast.error(t("privacy.delete_toast_typed").replace("{kw}", KEYWORD));
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
        const err = await res.json().catch(() => ({ error: t("privacy.delete_toast_err") }));
        toast.error(err.error || t("privacy.delete_toast_err"));
        setDeleting(false);
        return;
      }
      // Faz logout client-side e redireciona
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success(t("privacy.delete_toast_ok"));
      router.push("/");
      router.refresh();
    } catch (e) {
      toast.error(t("forgot.toast_network"));
      setDeleting(false);
    }
  }

  return (
    <main style={{ padding: "28px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <Link href="/dashboard" style={{ display: "inline-block", color: "#c4b5fd", fontSize: 18, fontWeight: 600, textDecoration: "none", marginBottom: 24, padding: "10px 14px", minHeight: 44 }}>
        {t("privacy.back")}
      </Link>

      <h1 className="serif" style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.2, marginBottom: 14, fontWeight: 700 }}>
        {t("privacy.h1")}
      </h1>
      <p style={{ fontSize: 21, color: "#fbf8ff", lineHeight: 1.55, marginBottom: 36, fontWeight: 500 }}>
        {t("privacy.intro")}
      </p>

      {/* Card 1: Baixar meus dados */}
      <section className="card" style={{ padding: "28px 24px", marginBottom: 20, border: "2px solid rgba(232,184,75,0.3)" }}>
        <div style={{ fontSize: 56, marginBottom: 14 }} aria-hidden="true">📦</div>
        <h2 className="serif" style={{ fontSize: "1.6rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
          {t("privacy.export_h2")}
        </h2>
        <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.6, marginBottom: 22, fontWeight: 500 }}>
          {t("privacy.export_desc")}
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
          {exporting ? t("privacy.export_preparing") : t("privacy.export_cta")}
        </button>
      </section>

      {/* Card 2: Política de Privacidade */}
      <section className="card" style={{ padding: "28px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 14 }} aria-hidden="true">📜</div>
        <h2 className="serif" style={{ fontSize: "1.6rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
          {t("privacy.policy_h2")}
        </h2>
        <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.6, marginBottom: 22, fontWeight: 500 }}>
          {t("privacy.policy_desc")}
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
          {t("privacy.policy_cta")}
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
          {t("privacy.delete_h2")}
        </h2>
        <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.6, marginBottom: 18, fontWeight: 500 }}>
          {t("privacy.delete_desc")}
        </p>
        <p style={{ fontSize: 17, color: "#fca5a5", lineHeight: 1.55, marginBottom: 22, fontWeight: 600 }}>
          {t("privacy.delete_warning")}
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
            {t("privacy.delete_start")}
          </button>
        ) : (
          <div>
            <label htmlFor="confirm" style={{ display: "block", color: "#fbf8ff", fontSize: 19, fontWeight: 700, marginBottom: 10 }}>
              {t("privacy.delete_confirm_label").replace("{kw}", KEYWORD)}
            </label>
            <input
              id="confirm"
              type="text"
              className="input input-big"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={KEYWORD}
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
                {t("privacy.cancel")}
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting || confirmText !== KEYWORD}
                style={{
                  flex: 1,
                  minWidth: 140,
                  background: confirmText === KEYWORD ? "linear-gradient(135deg,#dc2626,#991b1b)" : "rgba(220,38,38,0.3)",
                  color: "#fff",
                  border: "none",
                  padding: "18px 20px",
                  borderRadius: 12,
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: confirmText === KEYWORD && !deleting ? "pointer" : "not-allowed",
                  opacity: confirmText === KEYWORD && !deleting ? 1 : 0.6,
                  minHeight: 64,
                }}
              >
                {deleting ? t("privacy.deleting") : t("privacy.delete_final")}
              </button>
            </div>
          </div>
        )}
      </section>

      <p style={{ fontSize: 17, color: "#c4b5fd", lineHeight: 1.6, marginTop: 28, textAlign: "center", fontWeight: 500 }}>
        {t("privacy.footer_pre")}
        <a href="/privacidade" style={{ color: "#e8b84b", textDecoration: "underline" }}>
          {t("privacy.footer_link")}
        </a>
        .
      </p>
    </main>
  );
}
