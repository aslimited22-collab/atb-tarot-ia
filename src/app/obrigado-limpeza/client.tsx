"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";

type Mode = "logged-purchased" | "logged-waiting" | "account-exists" | "needs-signup";

export default function ObrigadoLimpezaClient({ mode, email, orderId }: { mode: Mode; email: string; orderId: string }) {
  const router = useRouter();
  const { t } = useT();

  // Caso logado e aguardando webhook: poll a cada 4s
  useEffect(() => {
    if (mode === "logged-waiting") {
      const t = setInterval(() => router.refresh(), 4000);
      return () => clearInterval(t);
    }
  }, [mode, router]);

  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)",
      color: "#fbf8ff",
      padding: "20px 16px 40px",
    }}>
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease-out both; }
      `}</style>

      <div style={{ maxWidth: 580, width: "100%", margin: "0 auto", textAlign: "center" }}>
        {/* Imagem sagrada do altar — sempre presente */}
        <div className="fade-up" style={{
          borderRadius: 24,
          overflow: "hidden",
          marginBottom: 28,
          boxShadow: "0 25px 70px rgba(232,184,75,0.35), 0 0 0 3px rgba(232,184,75,0.5)",
        }}>
          <Image
            src="/img/limpeza-altar.png"
            alt={t("thanks.altar_alt")}
            width={1536}
            height={1024}
            priority
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>

        <HowToReceiveBox />

        <div className="fade-up" style={{ animationDelay: "0.15s" }}>
          {mode === "logged-purchased" && <LoggedPurchased orderId={orderId} />}
          {mode === "logged-waiting" && <LoggedWaiting />}
          {mode === "account-exists" && <AccountExists email={email} orderId={orderId} />}
          {mode === "needs-signup" && <NeedsSignup initialEmail={email} orderId={orderId} />}
        </div>
      </div>
    </main>
  );
}

function HowToReceiveBox() {
  const { t } = useT();
  const rows = [
    { h: t("thanks.how_email_h"), d: t("thanks.how_email_d") },
    { h: t("thanks.how_whatsapp_h"), d: t("thanks.how_whatsapp_d") },
    { h: t("thanks.how_button_h"), d: t("thanks.how_button_d") },
  ];
  return (
    <div
      className="fade-up"
      style={{
        animationDelay: "0.08s",
        textAlign: "left",
        background: "linear-gradient(135deg, rgba(232,184,75,0.16), rgba(126,232,248,0.10))",
        border: "2px solid rgba(232,184,75,0.5)",
        borderRadius: 18,
        padding: "22px 22px 18px",
        margin: "12px 0 24px",
        boxShadow: "0 12px 30px rgba(232,184,75,0.18)",
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: "1.25rem",
          color: "#f5c860",
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 14,
          lineHeight: 1.3,
        }}
      >
        {t("thanks.how_to_receive_title")}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              padding: "12px 14px",
              background: "rgba(18,0,37,0.55)",
              borderRadius: 12,
              border: "1px solid rgba(232,184,75,0.25)",
            }}
          >
            <div style={{ fontSize: 21, fontWeight: 800, color: "#fbf8ff", lineHeight: 1.3, marginBottom: 6 }}>
              {r.h}
            </div>
            <div style={{ fontSize: 20, color: "#c4b5fd", lineHeight: 1.55, fontWeight: 500 }}>
              {r.d}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaveLinkAviso() {
  const { t } = useT();
  return (
    <div
      style={{
        margin: "10px auto 0",
        maxWidth: 460,
        padding: "16px 18px",
        background: "rgba(126,232,248,0.08)",
        border: "1.5px solid rgba(126,232,248,0.35)",
        borderRadius: 14,
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: "#7ee8f8", marginBottom: 8, lineHeight: 1.3 }}>
        {t("thanks.save_link_title")}
      </div>
      <div style={{ fontSize: 20, color: "#fbf8ff", lineHeight: 1.55, fontWeight: 500 }}>
        {t("thanks.save_link_desc")}
      </div>
    </div>
  );
}

function LoggedPurchased({ orderId }: { orderId: string }) {
  const { t } = useT();
  return (
    <>
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }}>✨</div>
      <h1 className="serif" style={{ fontSize: "clamp(2.2rem, 6vw, 3rem)", color: "#e8b84b", lineHeight: 1.1, marginBottom: 18, fontWeight: 700 }}>
        {t("thanks.purchased_h1")}
      </h1>
      <p style={{ fontSize: "1.3rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24, fontWeight: 500 }}>
        {t("thanks.purchased_desc")}
      </p>

      {orderId ? (
        <Link
          href={`/entrega/${orderId}`}
          style={{
            display: "block",
            background: "linear-gradient(135deg,#e8b84b,#c9950a)",
            color: "#120025",
            fontWeight: 800,
            fontSize: 22,
            padding: "22px 28px",
            borderRadius: 16,
            textDecoration: "none",
            minHeight: 72,
            margin: "8px auto 18px",
            maxWidth: 460,
            boxShadow: "0 12px 28px rgba(232,184,75,0.45)",
            textAlign: "center",
          }}
        >
          {t("thanks.receive_cta")} →
        </Link>
      ) : (
        <Link
          href="/dashboard/limpeza-espiritual"
          style={{
            display: "block",
            background: "linear-gradient(135deg,#e8b84b,#c9950a)",
            color: "#120025",
            fontWeight: 800,
            fontSize: 22,
            padding: "22px 28px",
            borderRadius: 16,
            textDecoration: "none",
            minHeight: 72,
            margin: "8px auto 18px",
            maxWidth: 460,
            boxShadow: "0 12px 28px rgba(232,184,75,0.45)",
            textAlign: "center",
          }}
        >
          {t("thanks.receive_cta")} →
        </Link>
      )}

      <SaveLinkAviso />

      <p style={{ fontSize: 15, color: "#c4b5fd", fontStyle: "italic", marginTop: 16 }}>
        {t("thanks.purchased_blessing")}
      </p>
    </>
  );
}

function LoggedWaiting() {
  const { t } = useT();
  return (
    <>
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }}>🕊️</div>
      <h1 className="serif" style={{ fontSize: "clamp(2rem, 5.5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 16, fontWeight: 700 }}>
        {t("thanks.waiting_h1")}
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24, fontWeight: 500 }}>
        {t("thanks.waiting_desc_part1")}{" "}
        <strong style={{ color: "#f5c860" }}>{t("thanks.waiting_desc_part2")}</strong>{". "}
        {t("thanks.waiting_desc_part3")}
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%", background: "#e8b84b",
            animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.3)", borderRadius: 14, padding: "16px 18px", marginTop: 8 }}>
        <p style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
          {t("thanks.waiting_autoreload")}
        </p>
      </div>
    </>
  );
}

// Magic-link 1-clique pra Limpeza — entra direto sem senha (público 60+).
// Reutiliza as i18n keys genéricas de thanks_pergunta.magic_link_*/resend_*.
function MagicLinkBox({ email }: { email: string }) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendMagic() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: "/dashboard/limpeza-espiritual" }),
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
      {sent ? (
        <div
          style={{
            background: "rgba(232,184,75,0.15)",
            border: "2px solid #e8b84b",
            borderRadius: 12,
            padding: "16px 18px",
            textAlign: "left",
          }}
        >
          <p style={{ fontSize: 17, fontWeight: 800, color: "#e8b84b", margin: "0 0 6px", textAlign: "center" }}>
            ✉ {t("thanks_pergunta.resend_sent")}
          </p>
          <p
            style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}
            dangerouslySetInnerHTML={{ __html: t("thanks_pergunta.resend_sent_card_body") }}
          />
        </div>
      ) : (
        <button
          onClick={sendMagic}
          disabled={loading}
          className="btn-gold btn-big"
          style={{
            width: "100%",
            opacity: loading ? 0.55 : 1,
            cursor: loading ? "not-allowed" : "pointer",
            border: "none",
          }}
        >
          {loading ? t("thanks_pergunta.resend_loading") : t("thanks_pergunta.magic_link_cta")}
        </button>
      )}
      <p style={{ fontSize: 14, color: "#c4b5fd", margin: "12px 0 0", lineHeight: 1.5 }}>
        {t("thanks_pergunta.magic_link_hint")}
      </p>
    </div>
  );
}

function AccountExists({ email, orderId }: { email: string; orderId: string }) {
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
    const target = orderId ? `/entrega/${orderId}` : "/dashboard/limpeza-espiritual";
    router.push(target);
    router.refresh();
  }

  return (
    <>
      <div style={{ fontSize: 64, marginBottom: 14 }}>🌟</div>
      <h1 className="serif" style={{ fontSize: "clamp(2rem, 5.5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.1, marginBottom: 14, fontWeight: 700 }}>
        {t("thanks.exists_h1")}
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 26, fontWeight: 500 }}>
        {t("thanks.exists_desc")}
      </p>

      {/* Magic-link primário — entra sem senha */}
      <MagicLinkBox email={email} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: "#9575cd", fontSize: 14 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(196,181,253,0.25)" }} />
        <span>{t("auth.or")}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(196,181,253,0.25)" }} />
      </div>

      <form onSubmit={handleLogin} className="card" style={{ padding: "32px 26px", textAlign: "left" }}>
        <label style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t("auth.email_label")}</label>
        <input className="input input-big" style={{ marginBottom: 22, opacity: 0.85 }} type="email" value={email} disabled />

        <label style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t("auth.password_label")}</label>
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
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              background: "rgba(232,184,75,0.15)", border: "1px solid rgba(232,184,75,0.4)",
              color: "#e8b84b", fontSize: 22, fontWeight: 700,
              width: 64, height: 64, padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 12, cursor: "pointer",
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

        <p style={{ textAlign: "center", fontSize: 20, color: "#fbf8ff", marginTop: 22, lineHeight: 1.6 }}>
          {t("auth.thanks_forgot")}
        </p>
        <Link
          href="/login"
          style={{
            display: "block",
            textAlign: "center",
            color: "#e8b84b",
            fontWeight: 700,
            fontSize: 20,
            textDecoration: "underline",
            padding: "20px 16px",
            minHeight: 64,
            borderRadius: 12,
            background: "rgba(232,184,75,0.06)",
          }}
        >
          {t("auth.thanks_recover")}
        </Link>
      </form>
    </>
  );
}

function NeedsSignup({ initialEmail, orderId }: { initialEmail: string; orderId: string }) {
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
    const target = orderId ? `/entrega/${orderId}` : "/dashboard/limpeza-espiritual";
    router.push(target);
    router.refresh();
  }

  return (
    <>
      <div style={{ fontSize: 64, marginBottom: 14 }}>🙏</div>
      <h1 className="serif" style={{ fontSize: "clamp(2.2rem, 6vw, 3rem)", color: "#e8b84b", lineHeight: 1.1, marginBottom: 14, fontWeight: 700 }}>
        {t("thanks.signup_h1")}
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 22, fontWeight: 500 }}>
        {t("thanks.signup_desc_part1")}<br />
        {t("thanks.signup_desc_part2")}{" "}
        <strong style={{ color: "#f5c860" }}>{t("thanks.signup_desc_part3")}</strong>.
      </p>

      {/* Magic-link primário — cria conta + entra em 1 toque, sem senha.
          Usa o email do pagamento (initialEmail) pra evitar mismatch. */}
      {initialEmail ? <MagicLinkBox email={initialEmail} /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: "#9575cd", fontSize: 14 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(196,181,253,0.25)" }} />
        <span>{t("auth.or")}</span>
        <div style={{ flex: 1, height: 1, background: "rgba(196,181,253,0.25)" }} />
      </div>

      <div style={{ background: "rgba(232,184,75,0.08)", border: "1px solid rgba(232,184,75,0.3)", borderRadius: 14, padding: "16px 20px", marginBottom: 22, textAlign: "left" }}>
        <p style={{ fontSize: 20, color: "#fbf8ff", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
          {t("auth.use_same_email")}
        </p>
      </div>

      <form onSubmit={handleSignup} className="card" style={{ padding: "30px 26px", textAlign: "left" }}>
        <label style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t("auth.thanks_name_label")}</label>
        <input
          className="input input-big"
          style={{ marginBottom: 20 }}
          type="text"
          placeholder={t("auth.thanks_name_placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={60}
          autoComplete="given-name"
        />

        <label style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t("auth.thanks_email_label")}</label>
        <input
          className="input input-big"
          style={{ marginBottom: 20 }}
          type="email"
          placeholder={t("auth.thanks_email_placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
        />

        <label style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t("auth.thanks_password_label")}</label>
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
              position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
              background: "rgba(232,184,75,0.15)", border: "1px solid rgba(232,184,75,0.4)",
              color: "#e8b84b", fontSize: 22, fontWeight: 700,
              width: 64, height: 64, padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 12, cursor: "pointer",
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
          {loading ? t("auth.signup_loading") : t("auth.thanks_cta")}
        </button>

        <p style={{ textAlign: "center", fontSize: 20, color: "#fbf8ff", marginTop: 22, lineHeight: 1.6 }}>
          {t("auth.have_account")}
        </p>
        <Link
          href="/login"
          style={{
            display: "block",
            textAlign: "center",
            color: "#e8b84b",
            fontWeight: 700,
            fontSize: 20,
            textDecoration: "underline",
            padding: "20px 16px",
            minHeight: 64,
            borderRadius: 12,
            background: "rgba(232,184,75,0.06)",
          }}
        >
          {t("auth.login_link")}
        </Link>
      </form>
    </>
  );
}
