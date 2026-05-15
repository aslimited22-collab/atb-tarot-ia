"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";

export default function CadastroPage() {
  const router = useRouter();
  const { t } = useT();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: t("auth.signup_error") }));
      setLoading(false);
      return toast.error(error || t("auth.signup_error"));
    }

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (loginError) return toast.error(t("auth.signup_created"));
    toast.success(t("auth.signup_success"));
    router.push("/dashboard");
    router.refresh();
  }

  const passwordValid = password.length >= 8;
  const nameValid = name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 84, marginBottom: 16 }} aria-hidden="true">🔮</div>
          <h1 className="serif" style={{ fontSize: "clamp(2.6rem, 6vw, 3.2rem)", color: "#f5f0ff", lineHeight: 1.1, marginBottom: 12, fontWeight: 700 }}>
            ATB
          </h1>
          <p style={{ color: "#fbf8ff", fontSize: 21, lineHeight: 1.55, fontWeight: 500 }}>
            {t("auth.signup_welcome")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: "40px 32px" }}>
          <h2 className="serif" style={{ fontSize: "1.9rem", color: "#e8b84b", marginBottom: 28, textAlign: "center", fontWeight: 700 }}>
            {t("nav.signup")}
          </h2>

          {/* Nome */}
          <label htmlFor="name" style={{ display: "block", color: "#fbf8ff", fontSize: 19, fontWeight: 700, marginBottom: 10 }}>
            {t("auth.thanks_name_label")}
          </label>
          <input
            id="name"
            className="input input-big"
            type="text"
            placeholder={t("auth.thanks_name_placeholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            autoComplete="given-name"
            style={{ marginBottom: nameValid || !name ? 24 : 8 }}
          />
          {name && !nameValid && (
            <p role="alert" style={{ color: "#ff8a8a", fontSize: 17, marginBottom: 16, marginTop: 4, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true">⚠️</span> {t("auth.signup_name_invalid")}
            </p>
          )}

          {/* Email */}
          <label htmlFor="email" style={{ display: "block", color: "#fbf8ff", fontSize: 19, fontWeight: 700, marginBottom: 10 }}>
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
            style={{ marginBottom: 6 }}
          />
          <p className="help-hint" style={{ marginBottom: 24, fontSize: 16, color: "#c4b5fd", lineHeight: 1.55 }}>
            {t("auth.signup_email_hint")}
          </p>

          {/* Senha */}
          <label htmlFor="password" style={{ display: "block", color: "#fbf8ff", fontSize: 19, fontWeight: 700, marginBottom: 10 }}>
            {t("auth.thanks_password_label")}
          </label>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <input
              id="password"
              className="input input-big"
              type={showPwd ? "text" : "password"}
              placeholder={t("auth.password_placeholder_new")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, marginTop: 10 }}>
            {passwordValid ? (
              <span style={{ color: "#86efac", fontSize: 16, fontWeight: 700 }}>{t("auth.signup_password_good")}</span>
            ) : (
              <span style={{ color: "#c4b5fd", fontSize: 16, fontWeight: 500 }}>
                {t("auth.signup_password_missing").replace("{n}", String(Math.max(0, 8 - password.length)))}
              </span>
            )}
          </div>

          <button
            disabled={loading || !nameValid || !emailValid || !passwordValid}
            className="btn-gold btn-big"
            style={{
              width: "100%",
              opacity: (loading || !nameValid || !emailValid || !passwordValid) ? 0.55 : 1,
              cursor: (loading || !nameValid || !emailValid || !passwordValid) ? "not-allowed" : "pointer",
              border: "none",
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            {loading ? t("auth.signup_loading") : t("auth.signup_cta")}
          </button>

          <div style={{ textAlign: "center", padding: "20px 0 0", borderTop: "1px solid rgba(196,181,253,0.18)", marginTop: 4 }}>
            <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.55, margin: "0 0 14px", fontWeight: 500 }}>
              {t("auth.have_account")}
            </p>
            <Link
              href="/login"
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
              {t("auth.login_link")}
            </Link>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link href="/" style={{ color: "#c4b5fd", fontSize: 17, textDecoration: "none", padding: "12px 18px", display: "inline-block", minHeight: 48 }}>
            ← {t("v2.back")}
          </Link>
        </div>
      </div>
    </main>
  );
}
