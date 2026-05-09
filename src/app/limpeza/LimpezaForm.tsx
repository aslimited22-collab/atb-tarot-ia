"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatPhoneBR, toE164BR } from "@/lib/phone";

const THEME_VALUES = [
  { v: "energia_pesada", icon: "🌑" },
  { v: "inveja", icon: "👁️" },
  { v: "amor_travado", icon: "💔" },
  { v: "caminhos_fechados", icon: "🚪" },
  { v: "separacao", icon: "✂️" },
  { v: "protecao_espiritual", icon: "🛡️" },
  { v: "dinheiro_trabalho", icon: "💰" },
  { v: "tristeza_coracao", icon: "😔" },
] as const;

const SIGNS = [
  { v: "aries", l: "Áries" }, { v: "touro", l: "Touro" }, { v: "gemeos", l: "Gêmeos" },
  { v: "cancer", l: "Câncer" }, { v: "leao", l: "Leão" }, { v: "virgem", l: "Virgem" },
  { v: "libra", l: "Libra" }, { v: "escorpiao", l: "Escorpião" }, { v: "sagitario", l: "Sagitário" },
  { v: "capricornio", l: "Capricórnio" }, { v: "aquario", l: "Aquário" }, { v: "peixes", l: "Peixes" },
];

export function LimpezaForm() {
  const router = useRouter();
  const { t } = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sign, setSign] = useState("");
  const [theme, setTheme] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const [forceProvider, setForceProvider] = useState<"" | "kiwify" | "stripe">("");

  const THEMES = THEME_VALUES.map((tv) => ({
    v: tv.v,
    icon: tv.icon,
    l: t(`v2.theme.${tv.v}` as any),
  }));

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    name.trim().length >= 2 &&
    emailValid &&
    !!theme &&
    question.trim().length >= 10 &&
    !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/limpeza/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          birth_date: birthDate || null,
          sign: sign || null,
          theme,
          question: question.trim(),
          force_provider: forceProvider || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || t("v2.errors.network"));
        setLoading(false);
        return;
      }
      // Armazena prévia + checkout pra próxima tela
      try {
        sessionStorage.setItem(
          `limpeza_v2_${data.orderId}`,
          JSON.stringify({
            previewText: data.previewText,
            checkoutUrl: data.checkoutUrl,
            price: data.price,
          })
        );
      } catch {}
      router.push(`/limpeza/preview/${data.orderId}`);
    } catch {
      toast.error(t("v2.errors.network"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: "30px 24px" }}>
      {/* Nome */}
      <label htmlFor="name" style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {t("v2.form.name")} <span style={{ color: "#f5c860" }}>*</span>
      </label>
      <input
        id="name"
        type="text"
        className="input input-big"
        placeholder={t("v2.form.name_ph")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        required
        autoComplete="given-name"
        style={{ marginBottom: 18 }}
      />

      {/* Email */}
      <label htmlFor="email" style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {t("v2.form.email")} <span style={{ color: "#f5c860" }}>*</span>
      </label>
      <input
        id="email"
        type="email"
        className="input input-big"
        placeholder={t("v2.form.email_ph")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        inputMode="email"
        style={{ marginBottom: 6 }}
      />
      <p style={{ fontSize: 20, color: "#c4b5fd", marginBottom: 18, lineHeight: 1.55 }}>
        {t("v2.form.email_hint")}
      </p>

      {/* WhatsApp opcional — com máscara BR e validação visual */}
      <label htmlFor="phone" style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {t("v2.form.phone")}{" "}
        <span style={{ color: "#9575cd", fontWeight: 400, fontSize: 14, fontStyle: "italic" }}>
          ({t("v2.form.phone_optional").replace(/[()]/g, "")})
        </span>
      </label>
      <input
        id="phone"
        type="tel"
        className="input input-big"
        placeholder="(47) 99999-1234"
        value={phone}
        onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
        autoComplete="tel"
        inputMode="tel"
        maxLength={16}
        aria-describedby="phone-hint phone-err"
        style={{ marginBottom: 6 }}
      />
      <p id="phone-hint" style={{ fontSize: 20, color: "#c4b5fd", marginBottom: 6, lineHeight: 1.55 }}>
        Coloque seu WhatsApp com DDD, exemplo: (47) 99999-1234
      </p>
      {phone && !toE164BR(phone).e164 && (
        <p id="phone-err" role="alert" style={{ fontSize: 16, color: "#ff8a8a", fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden="true">⚠️</span>
          Confira o número — algo parece faltando.
        </p>
      )}
      <div style={{ marginBottom: 18 }} />

      {/* Data nascimento + Signo opcionais lado a lado */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <div>
          <label htmlFor="birth" style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {t("v2.form.birth")}{" "}
            <span style={{ color: "#9575cd", fontWeight: 400, fontSize: 14, fontStyle: "italic" }}>
              ({t("v2.form.phone_optional").replace(/[()]/g, "")})
            </span>
          </label>
          <input
            id="birth"
            type="date"
            className="input"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div>
          <label htmlFor="sign" style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {t("v2.form.sign")}{" "}
            <span style={{ color: "#9575cd", fontWeight: 400, fontSize: 14, fontStyle: "italic" }}>
              ({t("v2.form.phone_optional").replace(/[()]/g, "")})
            </span>
          </label>
          <select
            id="sign"
            className="input"
            value={sign}
            onChange={(e) => setSign(e.target.value)}
            style={{ appearance: "auto" }}
          >
            <option value="">—</option>
            {SIGNS.map((s) => (
              <option key={s.v} value={s.v}>{s.l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tema (chips) — botões grandes 64px+ p/ 60+ */}
      <label style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
        {t("v2.form.theme")} <span style={{ color: "#f5c860" }}>*</span>
      </label>
      <div role="radiogroup" aria-label={t("v2.form.theme")} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 22 }}>
        {THEMES.map((th) => (
          <button
            key={th.v}
            type="button"
            role="radio"
            aria-checked={theme === th.v}
            onClick={() => setTheme(th.v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 16px",
              background: theme === th.v ? "rgba(232,184,75,0.22)" : "rgba(196,181,253,0.06)",
              border: theme === th.v ? "2.5px solid #e8b84b" : "1.5px solid rgba(196,181,253,0.25)",
              borderRadius: 14,
              color: theme === th.v ? "#fbf8ff" : "#e2d9f3",
              fontSize: 20,
              fontWeight: theme === th.v ? 700 : 600,
              cursor: "pointer",
              textAlign: "left",
              minHeight: 64,
            }}
          >
            <span style={{ fontSize: 26 }} aria-hidden="true">{th.icon}</span>
            <span>{th.l}</span>
          </button>
        ))}
      </div>

      {/* Pergunta */}
      <label htmlFor="question" style={{ display: "block", color: "#fbf8ff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
        {t("v2.form.question")} <span style={{ color: "#f5c860" }}>*</span>
      </label>
      <textarea
        id="question"
        className="input"
        placeholder={t("v2.form.question_ph")}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={6}
        maxLength={800}
        required
        style={{ minHeight: 130, fontSize: 16, lineHeight: 1.55, fontFamily: "inherit", resize: "vertical" }}
      />
      <div style={{ fontSize: 14, color: "#c4b5fd", textAlign: "right", marginTop: 4, marginBottom: 24, fontStyle: "italic" }}>
        {`${question.length}/800`}
      </div>

      {/* Toggle país (idioma do checkout) */}
      <div style={{
        background: "rgba(196,181,253,0.05)",
        border: "1px solid rgba(196,181,253,0.18)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 18,
      }}>
        <p style={{ fontSize: 20, color: "#fbf8ff", fontWeight: 700, marginBottom: 10 }}>
          {t("v2.form.where")}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setForceProvider("kiwify")}
            style={{
              flex: 1, padding: "16px 12px", fontSize: 20, minHeight: 64,
              background: forceProvider === "kiwify" ? "rgba(232,184,75,0.18)" : "rgba(196,181,253,0.05)",
              border: forceProvider === "kiwify" ? "2.5px solid #e8b84b" : "1.5px solid rgba(196,181,253,0.25)",
              borderRadius: 12,
              color: forceProvider === "kiwify" ? "#fbf8ff" : "#e2d9f3",
              fontWeight: forceProvider === "kiwify" ? 700 : 600,
              cursor: "pointer",
            }}
          >
            {t("v2.form.where_br")}
          </button>
          <button
            type="button"
            onClick={() => setForceProvider("stripe")}
            style={{
              flex: 1, padding: "16px 12px", fontSize: 20, minHeight: 64,
              background: forceProvider === "stripe" ? "rgba(232,184,75,0.18)" : "rgba(196,181,253,0.05)",
              border: forceProvider === "stripe" ? "2.5px solid #e8b84b" : "1.5px solid rgba(196,181,253,0.25)",
              borderRadius: 12,
              color: forceProvider === "stripe" ? "#fbf8ff" : "#e2d9f3",
              fontWeight: forceProvider === "stripe" ? 700 : 600,
              cursor: "pointer",
            }}
          >
            {t("v2.form.where_intl")}
          </button>
        </div>
        {!forceProvider && (
          <p style={{ fontSize: 14, color: "#9575cd", marginTop: 8, lineHeight: 1.5, fontStyle: "italic" }}>
            {t("v2.form.where_hint")}
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-gold btn-big"
        style={{
          width: "100%",
          opacity: canSubmit ? 1 : 0.55,
          cursor: canSubmit ? "pointer" : "not-allowed",
          border: "none",
        }}
      >
        {loading ? t("v2.form.submitting") : t("v2.form.submit")}
      </button>

      {/* Selo de confiança + privacidade */}
      <div style={{ marginTop: 18, padding: "16px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,181,253,0.18)", borderRadius: 12, textAlign: "center" }}>
        <div style={{ fontSize: 20, color: "#fbf8ff", fontWeight: 700, marginBottom: 6 }}>
          🔒 Pagamento 100% Seguro
        </div>
        <div style={{ fontSize: 14, color: "#c4b5fd", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
          Cartão · Pix · Apple Pay · Google Pay
        </div>
      </div>
      <p style={{ fontSize: 14, color: "#c4b5fd", lineHeight: 1.6, textAlign: "center", marginTop: 14, fontStyle: "italic" }}>
        {t("v2.form.privacy")}<br />
        {t("v2.form.privacy2")}
      </p>
    </form>
  );
}
