"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import PurchaseWaitSpinner from "@/components/PurchaseWaitSpinner";

type Mode = "logged-with-credits" | "account-exists" | "needs-signup" | "check-email";

export default function ObrigadoPerguntaClient({
  mode,
  email,
  name,
  purchaseConfirmed,
}: {
  mode: Mode;
  email: string;
  name?: string;
  purchaseConfirmed?: boolean;
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
      <PurchaseWaitSpinner email={email || null} skip={purchaseConfirmed !== false}>
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
        {mode === "check-email" && <CheckEmail email={email} />}
        {mode === "account-exists" && <LoginForm email={email} />}
        {mode === "needs-signup" && <SignupForm initialEmail={email} />}
      </div>
      </PurchaseWaitSpinner>
    </main>
  );
}

// Cliente acabou de pagar. Webhook ja disparou welcome email com magic-link.
// Aqui mostramos "verifique seu email" + botao reenviar caso nao tenha chegado.
function CheckEmail({ email }: { email: string }) {
  const { t } = useT();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: "/dashboard/chat?welcome=pergunta" }),
      });
      if (!res.ok) {
        toast.error(t("thanks_pergunta.resend_error"));
        setLoading(false);
        return;
      }
      setSent(true);
      toast.success(t("thanks_pergunta.resend_ok"));
    } catch {
      toast.error(t("thanks_pergunta.resend_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card fade-up" style={{ padding: "36px 28px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 14 }} aria-hidden="true">✉</div>
      <h2 className="serif" style={{ fontSize: "1.7rem", color: "#e8b84b", marginBottom: 10, fontWeight: 700, lineHeight: 1.2 }}>
        {t("thanks_pergunta.check_email_h1")}
      </h2>
      <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.6, marginBottom: 16, fontWeight: 500 }}>
        {t("thanks_pergunta.check_email_desc")}
      </p>
      <div
        style={{
          background: "rgba(232,184,75,0.12)",
          border: "1.5px solid rgba(232,184,75,0.45)",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 17, color: "#f5c860", margin: 0, fontWeight: 700, wordBreak: "break-all" }}>
          {email}
        </p>
      </div>
      <p style={{ fontSize: 16, color: "#c4b5fd", lineHeight: 1.55, marginBottom: 24 }}>
        {t("thanks_pergunta.check_email_hint")}
      </p>
      <button
        onClick={resend}
        disabled={loading || sent}
        className="btn-gold btn-big"
        style={{
          width: "100%",
          opacity: loading || sent ? 0.55 : 1,
          cursor: loading || sent ? "not-allowed" : "pointer",
          border: "none",
        }}
      >
        {sent ? t("thanks_pergunta.resend_sent") : loading ? t("thanks_pergunta.resend_loading") : t("thanks_pergunta.resend_cta")}
      </button>
    </div>
  );
}

function AlreadyLogged() {
  const router = useRouter();
  const { t } = useT();
  useEffect(() => {
    // Cliente já tem conta logada — manda direto pro chat. Zero fricção.
    router.push("/dashboard/chat?welcome=pergunta");
    router.refresh();
  }, [router]);

  return (
    <div className="fade-up" style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", gap: 10, marginBottom: 24 }}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <p style={{ fontSize: 20, color: "#fbf8ff", fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
        {t("thanks_pergunta.cta")}
      </p>
    </div>
  );
}

function LoginForm({ email }: { email: string }) {
  const router = useRouter();
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

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

  async function sendMagic() {
    setMagicLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: "/dashboard/chat?welcome=pergunta" }),
      });
      if (!res.ok) {
        toast.error(t("thanks_pergunta.resend_error"));
        setMagicLoading(false);
        return;
      }
      setMagicSent(true);
      toast.success(t("thanks_pergunta.resend_ok"));
    } catch {
      toast.error(t("thanks_pergunta.resend_error"));
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <div className="fade-up" style={{ textAlign: "left" }}>
      {/* Magic-link primario (zero senha) */}
      <div
        style={{
          background: "rgba(232,184,75,0.08)",
          border: "2px solid rgba(232,184,75,0.5)",
          borderRadius: 16,
          padding: "24px 22px",
          marginBottom: 18,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }} aria-hidden="true">✉</div>
        <p style={{ fontSize: 19, color: "#fbf8ff", lineHeight: 1.55, margin: "0 0 18px", fontWeight: 600 }}>
          {t("thanks_pergunta.magic_link_intro")}
        </p>
        <button
          onClick={sendMagic}
          disabled={magicLoading || magicSent}
          className="btn-gold btn-big"
          style={{
            width: "100%",
            opacity: magicLoading || magicSent ? 0.55 : 1,
            cursor: magicLoading || magicSent ? "not-allowed" : "pointer",
            border: "none",
          }}
        >
          {magicSent ? t("thanks_pergunta.resend_sent") : magicLoading ? t("thanks_pergunta.resend_loading") : t("thanks_pergunta.magic_link_cta")}
        </button>
        <p style={{ fontSize: 14, color: "#c4b5fd", margin: "12px 0 0", lineHeight: 1.5 }}>
          {t("thanks_pergunta.magic_link_hint")}
        </p>
      </div>

      {/* Divisor "ou" */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 18px", color: "#9575cd", fontSize: 14 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(196,181,253,0.25)" }} />
        <span>{t("auth.or")}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(196,181,253,0.25)" }} />
      </div>

      {/* Fallback: login com senha */}
      <form onSubmit={handleLogin} className="card" style={{ padding: "26px 22px", textAlign: "left" }}>
        <label style={{ display: "block", color: "#fbf8ff", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
          {t("auth.email_label")}
        </label>
        <input className="input input-big" type="email" value={email} disabled style={{ marginBottom: 18, opacity: 0.85 }} />

        <label style={{ display: "block", color: "#fbf8ff", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
          {t("auth.password_label")}
        </label>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input
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
              height: 56,
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
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 14,
            border: "2px solid rgba(232,184,75,0.5)",
            background: "transparent",
            color: "#e8b84b",
            fontSize: 17,
            fontWeight: 600,
            cursor: loading || !password ? "not-allowed" : "pointer",
            opacity: loading || !password ? 0.55 : 1,
          }}
        >
          {loading ? t("auth.login_loading") : t("auth.login_cta")}
        </button>
      </form>
    </div>
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
