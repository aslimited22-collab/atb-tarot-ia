"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/I18nProvider";

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
      <label htmlFor="name" style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
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
      <label htmlFor="email" style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
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
      <p style={{ fontSize: 13, color: "#9575cd", marginBottom: 18, lineHeight: 1.5 }}>
        {t("v2.form.email_hint")}
      </p>

      {/* WhatsApp opcional */}
      <label htmlFor="phone" style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
        {t("v2.form.phone")} <span style={{ color: "#9575cd", fontWeight: 400, fontSize: 14 }}>{t("v2.form.phone_optional")}</span>
      </label>
      <input
        id="phone"
        type="tel"
        className="input input-big"
        placeholder={t("v2.form.phone_ph")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
        inputMode="tel"
        maxLength={20}
        style={{ marginBottom: 18 }}
      />

      {/* Data nascimento + Signo opcionais lado a lado */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <div>
          <label htmlFor="birth" style={{ display: "block", color: "#fbf8ff", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            {t("v2.form.birth")} <span style={{ color: "#9575cd", fontWeight: 400, fontSize: 12 }}>{t("v2.form.phone_optional")}</span>
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
          <label htmlFor="sign" style={{ display: "block", color: "#fbf8ff", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            {t("v2.form.sign")} <span style={{ color: "#9575cd", fontWeight: 400, fontSize: 12 }}>{t("v2.form.phone_optional")}</span>
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

      {/* Tema (chips) */}
      <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
        {t("v2.form.theme")} <span style={{ color: "#f5c860" }}>*</span>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 22 }}>
        {THEMES.map((th) => (
          <button
            key={th.v}
            type="button"
            onClick={() => setTheme(th.v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              background: theme === th.v ? "rgba(232,184,75,0.18)" : "rgba(196,181,253,0.05)",
              border: theme === th.v ? "2px solid #e8b84b" : "1px solid rgba(196,181,253,0.2)",
              borderRadius: 12,
              color: theme === th.v ? "#fbf8ff" : "#c4b5fd",
              fontSize: 15,
              fontWeight: theme === th.v ? 700 : 500,
              cursor: "pointer",
              textAlign: "left",
              minHeight: 50,
            }}
          >
            <span style={{ fontSize: 22 }}>{th.icon}</span>
            <span>{th.l}</span>
          </button>
        ))}
      </div>

      {/* Pergunta */}
      <label htmlFor="question" style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
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
      <div style={{ fontSize: 12, color: "#9575cd", textAlign: "right", marginTop: 4, marginBottom: 24 }}>
        {question.length}/800
      </div>

      {/* Toggle país (idioma do checkout) */}
      <div style={{
        background: "rgba(196,181,253,0.05)",
        border: "1px solid rgba(196,181,253,0.18)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 18,
      }}>
        <p style={{ fontSize: 14, color: "#fbf8ff", fontWeight: 700, marginBottom: 10 }}>
          {t("v2.form.where")}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setForceProvider("kiwify")}
            style={{
              flex: 1, padding: "12px 8px", fontSize: 14,
              background: forceProvider === "kiwify" ? "rgba(232,184,75,0.18)" : "rgba(196,181,253,0.05)",
              border: forceProvider === "kiwify" ? "2px solid #e8b84b" : "1px solid rgba(196,181,253,0.2)",
              borderRadius: 10,
              color: forceProvider === "kiwify" ? "#fbf8ff" : "#c4b5fd",
              fontWeight: forceProvider === "kiwify" ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {t("v2.form.where_br")}
          </button>
          <button
            type="button"
            onClick={() => setForceProvider("stripe")}
            style={{
              flex: 1, padding: "12px 8px", fontSize: 14,
              background: forceProvider === "stripe" ? "rgba(232,184,75,0.18)" : "rgba(196,181,253,0.05)",
              border: forceProvider === "stripe" ? "2px solid #e8b84b" : "1px solid rgba(196,181,253,0.2)",
              borderRadius: 10,
              color: forceProvider === "stripe" ? "#fbf8ff" : "#c4b5fd",
              fontWeight: forceProvider === "stripe" ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {t("v2.form.where_intl")}
          </button>
        </div>
        {!forceProvider && (
          <p style={{ fontSize: 12, color: "#9575cd", marginTop: 8, lineHeight: 1.45 }}>
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

      <p style={{ fontSize: 13, color: "#9575cd", lineHeight: 1.55, textAlign: "center", marginTop: 16 }}>
        {t("v2.form.privacy")}<br />
        {t("v2.form.privacy2")}
      </p>
    </form>
  );
}
