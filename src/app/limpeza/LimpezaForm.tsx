"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useT } from "@/lib/i18n/I18nProvider";

// Passo 1 do funil (reforma "valor antes do preço"): só nome + tema + o que
// está sentindo. SEM e-mail/telefone/nascimento/signo — o e-mail é capturado no
// passo 2 (/limpeza/previa), depois da pessoa ver a prévia. Menos atrito = mais
// gente avança. O provider (Kiwify/Stripe) é decidido por geo no passo 2.
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

export function LimpezaForm() {
  const router = useRouter();
  const { t } = useT();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const THEMES = THEME_VALUES.map((tv) => ({
    v: tv.v,
    icon: tv.icon,
    l: t(`v2.theme.${tv.v}` as any),
  }));

  const canSubmit =
    name.trim().length >= 2 &&
    !!theme &&
    question.trim().length >= 10 &&
    !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      // Passo 1: gera SÓ a prévia (sem criar order — o pedido nasce no passo 2
      // com o e-mail). Guarda tudo na sessionStorage pra tela da prévia.
      const res = await fetch("/api/limpeza/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          theme,
          question: question.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.previewText) {
        toast.error(data.error || t("v2.errors.network"));
        setLoading(false);
        return;
      }
      try {
        sessionStorage.setItem(
          "limpeza_v2_previa",
          JSON.stringify({
            name: name.trim(),
            theme,
            question: question.trim(),
            previewText: data.previewText,
          })
        );
      } catch {}
      router.push("/limpeza/previa");
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
        style={{ marginBottom: 22 }}
      />

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

      {/* CTA — leva pra prévia grátis (sem pedir e-mail ainda) */}
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

      <p style={{ fontSize: 15, color: "#c4b5fd", lineHeight: 1.6, textAlign: "center", marginTop: 14, fontWeight: 500 }}>
        Grátis · leva 1 minuto · sem compromisso · 🔒 100% sigiloso
      </p>
    </form>
  );
}
