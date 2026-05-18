"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";

type Mode = "logged-with-credits" | "account-exists" | "needs-signup";

export default function ObrigadoPerguntaClient({
  mode,
  email,
}: {
  mode: Mode;
  email: string;
}) {
  const { t } = useT();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)",
        color: "#fbf8ff",
        padding: "32px 16px 60px",
      }}
    >
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.7s ease-out both; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div className="fade-up" style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }} aria-hidden="true">
          ✨
        </div>

        <h1
          className="serif fade-up"
          style={{
            fontSize: "clamp(2rem, 5.5vw, 2.6rem)",
            color: "#e8b84b",
            lineHeight: 1.15,
            marginBottom: 14,
            fontWeight: 700,
          }}
        >
          {t("thanks_pergunta.h1")}
        </h1>

        <p
          className="fade-up"
          style={{
            fontSize: 21,
            color: "#fbf8ff",
            lineHeight: 1.65,
            marginBottom: 28,
            fontWeight: 500,
          }}
        >
          {t("thanks_pergunta.desc")}
        </p>

        {mode === "logged-with-credits" && <AlreadyLogged />}
        {mode === "account-exists" && <LoginForm email={email} />}
        {mode === "needs-signup" && <SignupForm initialEmail={email} />}
      </div>
    </main>
  );
}

function AlreadyLogged() {
  const { t } = useT();
  return (
    <Link
      href="/dashboard/chat"
      style={{
        display: "block",
        background: "linear-gradient(135deg, #e8b84b, #c9950a)",
        color: "#120025",
        fontWeight: 800,
        fontSize: 22,
        padding: "22px 28px",
        borderRadius: 16,
        textDecoration: "none",
        minHeight: 72,
        margin: "20px auto",
        maxWidth: 460,
        boxShadow: "0 12px 28px rgba(232,184,75,0.45)",
        textAlign: "center",
      }}
    >
      {t("thanks_pergunta.cta")}
    </Link>
  );
}

function LoginForm({ email }: { email: string }) {
  const router = useRouter();
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    setLoading(false);
    if (error) return toast.error(t("auth.login_error"));
    toast.success(t("auth.login_welcome_back"));
    router.push("/dashboard/chat");
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="card fade-up" style={{ padding: "32px 26px", textAlign: "left" }}>
      <label style={{ display: "block", color: "#fbf8ff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {t("auth.email_label")}
      </label>
      <input className="input input-big" type="email" value={email} disabled style={{ marginBottom: 22, opacity: 0.85 }} />

      <label style={{ display: "block", color: "#fbf8ff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {t("auth.password_label")}
      </label>
      <div style={{ position: "relative", marginBottom: 24 }}>
        <input
          className="input input-big"
          type={showPwd ? "text" : "password"}
          placeholder={t("auth.password_placeholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
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
        disabled={loading || !password}
        className="btn-gold btn-big"
        style={{
          width: "100%",
          opacity: loading || !password ? 0.55 : 1,
          cursor: loading || !password ? "not-allowed" : "pointer",
          border: "none",
        }}
      >
        {loading ? t("auth.login_loading") : t("auth.login_cta")}
      </button>
    </form>
  );
}

function SignupForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const { t } = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error(t("auth.signup_password_short"));
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      return toast.error(data.error || t("auth.signup_error"));
    }

    // Loga automaticamente
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    setLoading(false);

    if (loginError) {
      toast.success(t("auth.signup_created"));
      router.push("/login");
      return;
    }

    toast.success(t("auth.thanks_toast_ready"));
    // Vai direto pro chat — backend (trigger ou /api/chat GET) credita as
    // perguntas avulsas das purchases pendentes desse email
    router.push("/dashboard/chat?welcome=pergunta");
    router.refresh();
  }

  return (
    <form onSubmit={handleSignup} className="card fade-up" style={{ padding: "30px 26px", textAlign: "left" }}>
      <div
        style={{
          background: "rgba(232,184,75,0.08)",
          border: "1px solid rgba(232,184,75,0.3)",
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 22,
        }}
      >
        <p style={{ fontSize: 20, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
          {t("auth.use_same_email")}
        </p>
      </div>

      <label style={{ display: "block", color: "#fbf8ff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {t("auth.thanks_name_label")}
      </label>
      <input
        className="input input-big"
        type="text"
        placeholder={t("auth.thanks_name_placeholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={60}
        autoComplete="given-name"
        style={{ marginBottom: 20 }}
      />

      <label style={{ display: "block", color: "#fbf8ff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {t("auth.thanks_email_label")}
      </label>
      <input
        className="input input-big"
        type="email"
        placeholder={t("auth.thanks_email_placeholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        inputMode="email"
        style={{ marginBottom: 20 }}
      />

      <label style={{ display: "block", color: "#fbf8ff", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {t("auth.thanks_password_label")}
      </label>
      <div style={{ position: "relative", marginBottom: 24 }}>
        <input
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

      <button
        disabled={loading}
        className="btn-gold btn-big"
        style={{
          width: "100%",
          opacity: loading ? 0.6 : 1,
          cursor: loading ? "not-allowed" : "pointer",
          border: "none",
        }}
      >
        {loading ? t("auth.signup_loading") : t("thanks_pergunta.cta")}
      </button>
    </form>
  );
}
