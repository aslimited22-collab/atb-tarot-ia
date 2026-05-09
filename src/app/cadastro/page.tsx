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
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 80, marginBottom: 14 }}>🔮</div>
          <h1 className="serif" style={{ fontSize: "2.8rem", color: "#f5f0ff", lineHeight: 1.1, marginBottom: 10 }}>
            ATB
          </h1>
          <p style={{ color: "#fbf8ff", fontSize: 19, lineHeight: 1.5 }}>
            {t("auth.signup_welcome")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: "36px 32px" }}>
          <h2 className="serif" style={{ fontSize: "1.7rem", color: "#e8b84b", marginBottom: 24, textAlign: "center" }}>
            {t("nav.signup")}
          </h2>

          {/* Nome */}
          <label htmlFor="name" style={{ display: "block", color: "#fbf8ff", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
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
            <p style={{ color: "#f87171", fontSize: 15, marginBottom: 16, marginTop: 4 }}>
              {t("auth.signup_name_invalid")}
            </p>
          )}

          {/* Email */}
          <label htmlFor="email" style={{ display: "block", color: "#fbf8ff", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
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
          <p className="help-hint" style={{ marginBottom: 24, fontSize: 14 }}>
            {t("auth.signup_email_hint")}
          </p>

          {/* Senha */}
          <label htmlFor="password" style={{ display: "block", color: "#fbf8ff", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
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
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(232,184,75,0.15)",
                border: "1px solid rgba(232,184,75,0.4)",
                color: "#e8b84b",
                fontSize: 14,
                fontWeight: 700,
                padding: "10px 14px",
                borderRadius: 10,
                cursor: "pointer",
                minHeight: 0,
              }}
            >
              {showPwd ? t("auth.password_hide") : t("auth.password_show")}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, marginTop: 8 }}>
            {passwordValid ? (
              <span style={{ color: "#86efac", fontSize: 14, fontWeight: 600 }}>{t("auth.signup_password_good")}</span>
            ) : (
              <span style={{ color: "#9575cd", fontSize: 14 }}>
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

          <div style={{ textAlign: "center", padding: "16px 0", borderTop: "1px solid rgba(196,181,253,0.18)" }}>
            <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
              {t("auth.have_account")}<br />
              <Link href="/login" style={{ color: "#e8b84b", fontWeight: 700, fontSize: 19, textDecoration: "underline", display: "inline-block", marginTop: 8, padding: "8px 16px" }}>
                {t("auth.login_link")}
              </Link>
            </p>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/" style={{ color: "#c4b5fd", fontSize: 16, textDecoration: "none", padding: "8px 16px" }}>
            ← {t("v2.back")}
          </Link>
        </div>
      </div>
    </main>
  );
}
