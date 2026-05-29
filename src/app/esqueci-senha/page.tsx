"use client";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/I18nProvider";

export default function EsqueciSenhaPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      setLoading(false);
      if (!res.ok && res.status === 429) {
        const data = await res.json();
        return toast.error(data.error || t("forgot.toast_rate"));
      }
      // SEMPRE mostra sucesso (mesmo se e-mail não existe — evita enumeration)
      setSent(true);
      toast.success(t("forgot.toast_sent"));
    } catch {
      setLoading(false);
      toast.error(t("forgot.toast_network"));
    }
  }

  return (
    <main
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 84, marginBottom: 16 }} aria-hidden="true">🔑</div>
          <h1 className="serif" style={{ fontSize: "clamp(2.4rem, 6vw, 3rem)", color: "#f5f0ff", lineHeight: 1.1, marginBottom: 12, fontWeight: 700 }}>
            {t("forgot.h1")}
          </h1>
          <p style={{ color: "#fbf8ff", fontSize: 21, lineHeight: 1.55, fontWeight: 500 }}>
            {t("forgot.desc")}
          </p>
        </div>

        {sent ? (
          <div className="card" style={{ padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 80, marginBottom: 18 }} aria-hidden="true">💌</div>
            <h2 className="serif" style={{ fontSize: "1.7rem", color: "#e8b84b", marginBottom: 14, fontWeight: 700 }}>
              {t("forgot.sent_h1")}
            </h2>
            <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.65, fontWeight: 500, marginBottom: 24 }}>
              {t("forgot.sent_desc")}
            </p>
            <Link
              href="/login"
              className="btn-gold btn-big"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                fontSize: 19,
                fontWeight: 800,
                border: "none",
              }}
            >
              {t("forgot.back_login")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card" style={{ padding: "40px 32px" }}>
            <label htmlFor="email" style={{ display: "block", color: "#fbf8ff", fontSize: 21, fontWeight: 700, marginBottom: 10 }}>
              {t("forgot.email_label")}
            </label>
            <input
              id="email"
              type="email"
              className="input input-big"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
              inputMode="email"
              style={{ marginBottom: 28 }}
            />

            <button
              disabled={loading || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
              className="btn-gold btn-big"
              style={{
                width: "100%",
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
                border: "none",
                marginBottom: 18,
              }}
            >
              {loading ? t("forgot.sending") : t("forgot.submit")}
            </button>

            <div style={{ textAlign: "center", marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(196,181,253,0.18)" }}>
              <Link
                href="/login"
                style={{
                  display: "inline-block",
                  color: "#c4b5fd",
                  fontSize: 18,
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "12px 18px",
                  minHeight: 48,
                }}
              >
                {t("forgot.back_login")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
