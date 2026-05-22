"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  // Contagem de tentativas falhas — após 3 mostra hint "talvez outro email"
  const [failedCount, setFailedCount] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Login via endpoint server-side (rate limited + brute-force protection)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: t("auth.login_error") }));
        if (typeof data.failedCount === "number") setFailedCount(data.failedCount);
        if (res.status === 429) {
          return toast.error(data.error || "Muitas tentativas. Aguarde 1 hora.");
        }
        return toast.error(data.error || t("auth.login_error"));
      }
      toast.success(t("auth.login_welcome_back"));
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setLoading(false);
      toast.error(t("auth.login_error"));
    }
  }

  return (
    <main style={{
      background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Logo + título — UX 45+ tipografia maior */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 84, marginBottom: 16 }} aria-hidden="true">🔮</div>
          <h1 className="serif" style={{ fontSize: "clamp(2.6rem, 6vw, 3.2rem)", color: "#f5f0ff", lineHeight: 1.1, marginBottom: 12, fontWeight: 700 }}>
            ATB
          </h1>
          <p style={{ color: "#fbf8ff", fontSize: 21, lineHeight: 1.55, fontWeight: 500 }}>
            {t("auth.login_welcome")}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="card" style={{ padding: "40px 32px" }}>
          <h2 className="serif" style={{ fontSize: "1.9rem", color: "#e8b84b", marginBottom: 18, textAlign: "center", fontWeight: 700 }}>
            {t("nav.signin")}
          </h2>

          {/* ⚠️ Aviso — usar email do pagamento */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(232,184,75,0.18), rgba(232,184,75,0.08))",
              border: "1.5px solid rgba(232,184,75,0.5)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 26,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">💡</span>
            <p style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
              {t("auth.email_warning_login_pre")}<strong style={{ color: "#e8b84b" }}>{t("auth.email_warning_login_strong")}</strong>{t("auth.email_warning_login_post")}
            </p>
          </div>

          {/* Após 3 falhas: hint sobre email errado (caso comum 60+) */}
          {failedCount >= 3 && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(255,99,99,0.20), rgba(232,184,75,0.10))",
                border: "2px solid rgba(255,140,90,0.6)",
                borderRadius: 14,
                padding: "16px 18px",
                marginBottom: 22,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
              role="alert"
            >
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">🔎</span>
              <p style={{ fontSize: 16, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
                <strong style={{ color: "#ffb88c", display: "block", marginBottom: 4 }}>
                  {t("auth.maybe_other_email_title")}
                </strong>
                {t("auth.maybe_other_email_body")}
              </p>
            </div>
          )}

          {/* Email */}
          <label htmlFor="email" style={{ display: "block", color: "#fbf8ff", fontSize: 21, fontWeight: 700, marginBottom: 10 }}>
            {t("auth.email_label")}
          </label>
          <input
            id="email"
            className="input input-big"
            type="email"
            placeholder={t("auth.thanks_email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            style={{ marginBottom: 24 }}
          />

          {/* Senha */}
          <label htmlFor="password" style={{ display: "block", color: "#fbf8ff", fontSize: 21, fontWeight: 700, marginBottom: 10 }}>
            {t("auth.password_label")}
          </label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              id="password"
              className="input input-big"
              type={showPwd ? "text" : "password"}
              placeholder={t("auth.password_placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ paddingRight: 110 }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              aria-label={showPwd ? t("auth.password_hide_aria") : t("auth.password_show_aria")}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(232,184,75,0.15)",
                border: "1px solid rgba(232,184,75,0.4)",
                color: "#e8b84b",
                fontSize: 22,
                fontWeight: 700,
                width: 64,
                height: 64,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>

          <button
            disabled={loading}
            className="btn-gold btn-big"
            style={{
              width: "100%",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              border: "none",
              marginTop: 16,
              marginBottom: 20,
            }}
          >
            {loading ? t("auth.login_loading") : `✨ ${t("nav.signin")}`}
          </button>

          {/* Esqueci a senha */}
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <Link
              href="/esqueci-senha"
              style={{
                display: "inline-block",
                color: "#c4b5fd",
                fontSize: 18,
                fontWeight: 600,
                textDecoration: "underline",
                padding: "12px 18px",
                minHeight: 48,
              }}
            >
              {t("auth.forgot_password")}
            </Link>
          </div>

          {/* Link cadastro — botão grande estilo botão pra 45+ */}
          <div style={{ textAlign: "center", padding: "20px 0 0", borderTop: "1px solid rgba(196,181,253,0.18)", marginTop: 4 }}>
            <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.55, margin: "0 0 14px", fontWeight: 500 }}>
              {t("auth.no_account")}
            </p>
            <Link
              href="/cadastro"
              style={{
                display: "block",
                textAlign: "center",
                color: "#e8b84b",
                fontWeight: 700,
                fontSize: 19,
                textDecoration: "underline",
                padding: "18px 16px",
                minHeight: 64,
                borderRadius: 12,
                background: "rgba(232,184,75,0.08)",
                border: "1.5px solid rgba(232,184,75,0.3)",
              }}
            >
              ✨ {t("auth.signup_link")}
            </Link>
          </div>
        </form>

        {/* Voltar para landing */}
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link href="/" style={{ color: "#c4b5fd", fontSize: 17, textDecoration: "none", padding: "12px 18px", display: "inline-block", minHeight: 48 }}>
            ← {t("v2.back")}
          </Link>
        </div>
      </div>
    </main>
  );
}
