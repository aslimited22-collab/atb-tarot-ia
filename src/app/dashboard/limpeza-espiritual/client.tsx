"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { BackButton } from "@/components/BackButton";
import { useT } from "@/lib/i18n/I18nProvider";

type Msg = { id?: string; role: string; content: string };

// Mesma lógica do /dashboard/chat: simula digitação humana com pausas em
// pontuação. ATB precisa "respirar" entre as palavras em vez de cuspir
// texto de uma vez (sem isso parece IA cuspindo, não pessoa falando).
const CHAR_DELAY = 38;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function typeOut(text: string, onChar: (s: string) => void) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += text[i];
    onChar(out);
    const ch = text[i];
    const pause = (ch === "." || ch === "," || ch === "?" || ch === "!") ? CHAR_DELAY * 6
      : (ch === " " && Math.random() < 0.08) ? CHAR_DELAY * 4
      : CHAR_DELAY + Math.floor(Math.random() * 20);
    await sleep(pause);
  }
}

// Prompts ficam em PT — vão direto para a IA (DeepSeek/OpenAI) que recebe
// system prompt em PT. Traduzir aqui quebraria a personalidade da ATB.
const CARD_DEFS = [
  {
    id: "limpeza",
    icon: "🕯️",
    titleKey: "limpeza_dash.card_limpeza_title",
    saintKey: "limpeza_dash.card_limpeza_saint",
    descKey: "limpeza_dash.card_limpeza_desc",
    prompt: "Minha querida ATB, eu sinto que tem energia pesada na minha vida, parece que carrego um peso. Preciso de uma limpeza profunda. Me ajude a entender o que está pesando e como posso me limpar com a força de Nossa Senhora Aparecida.",
    color: "linear-gradient(135deg, #e8b84b 0%, #f5c860 50%, #c89a2a 100%)",
  },
  {
    id: "caminhos",
    icon: "🗝️",
    titleKey: "limpeza_dash.card_caminhos_title",
    saintKey: "limpeza_dash.card_caminhos_saint",
    descKey: "limpeza_dash.card_caminhos_desc",
    prompt: "Minha querida ATB, sinto que meus caminhos estão fechados, nada flui na minha vida, parece tudo travado. Preciso abrir meus caminhos. Me ajude com a força de Santo Antônio para desatar os nós e Exu do Ouro para abrir minha prosperidade.",
    color: "linear-gradient(135deg, #6a4a8a 0%, #8a5fb0 50%, #4a2f6a 100%)",
  },
  {
    id: "protecao",
    icon: "⚔️",
    titleKey: "limpeza_dash.card_protecao_title",
    saintKey: "limpeza_dash.card_protecao_saint",
    descKey: "limpeza_dash.card_protecao_desc",
    prompt: "Minha querida ATB, sinto que tem gente fazendo coisa ruim contra mim, sinto inveja, olho gordo, talvez até feitiço. Preciso de proteção sagrada. Me ajude a invocar São Miguel Arcanjo e São Jorge para me proteger e cortar tudo de ruim.",
    color: "linear-gradient(135deg, #d4344a 0%, #e85a72 50%, #8a1f30 100%)",
  },
] as const;

const SAINT_DEFS = [
  { icon: "👑", nameKey: "limpeza_dash.saint1_name", powerKey: "limpeza_dash.saint1_power" },
  { icon: "❤️‍🔥", nameKey: "limpeza_dash.saint2_name", powerKey: "limpeza_dash.saint2_power" },
  { icon: "⚔️", nameKey: "limpeza_dash.saint3_name", powerKey: "limpeza_dash.saint3_power" },
  { icon: "🙏", nameKey: "limpeza_dash.saint4_name", powerKey: "limpeza_dash.saint4_power" },
  { icon: "🛡️", nameKey: "limpeza_dash.saint5_name", powerKey: "limpeza_dash.saint5_power" },
  { icon: "🪢", nameKey: "limpeza_dash.saint6_name", powerKey: "limpeza_dash.saint6_power" },
] as const;

type PastLimpeza = { id: string; createdAt: string };

export default function LimpezaClient({
  purchased,
  justPurchased,
  firstName,
  kiwifyUrl,
  initialMessages,
  initialRemaining,
  hasProfile,
  pastLimpezas = [],
}: {
  purchased: boolean;
  justPurchased?: boolean;
  firstName: string;
  kiwifyUrl: string;
  initialMessages: Msg[];
  initialRemaining: number;
  hasProfile?: boolean;
  pastLimpezas?: PastLimpeza[];
}) {
  const router = useRouter();
  const { t } = useT();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Acabou de comprar mas o webhook ainda não chegou: aguarda confirmação com mensagem amigável
  if (!purchased && justPurchased) {
    return <ConfirmingPurchase firstName={firstName} />;
  }

  if (!purchased) {
    return <PurchaseGate firstName={firstName} kiwifyUrl={kiwifyUrl} />;
  }

  // Comprou mas ainda não preencheu o formulário de coleta de dados
  if (!hasProfile) {
    return <ProfileForm firstName={firstName} onSaved={() => router.refresh()} />;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || remaining <= 0) return;

    setLoading(true);
    setStreaming("");
    const optimistic: Msg = { role: "user", content: trimmed };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setActiveCard(null);

    // Pausa humana: ATB "lê e pensa" enquanto o indicador de digitação aparece
    // (sobreposto à latência da API via Promise.all — não somado).
    const minThink = sleep(1000 + Math.random() * 1500);
    try {
      const [res] = await Promise.all([
        fetch("/api/limpeza", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        }),
        minThink,
      ]);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `${t("limpeza_dash.toast_error_prefix")} ${res.status}`);
        setMessages((m) => m.slice(0, -1));
        setLoading(false);
        return;
      }

      // Acumula resposta inteira primeiro (sem mostrar). Depois, faz typeOut
      // pra simular digitação caractere a caractere — ATB respira entre
      // pontos e vírgulas, como uma médium falando ao telefone.
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
      }
      await typeOut(acc, setStreaming);
      setMessages((m) => [...m, { role: "assistant", content: acc }]);
      setStreaming("");
      setRemaining((r) => Math.max(0, r - 1));
    } catch {
      toast.error(t("limpeza_dash.toast_connection"));
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function pickCard(cardId: string) {
    if (loading || remaining <= 0) return;
    const card = CARD_DEFS.find((c) => c.id === cardId);
    if (!card) return;
    setActiveCard(cardId);
    setInput(card.prompt);
  }

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 760, margin: "0 auto", color: "#f5f0ff" }}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>

      <BackButton />

      {/* Header sagrado */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }} aria-hidden="true">🕊️</div>
        <h1 className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", lineHeight: 1.15, marginBottom: 6 }}>
          {t("limpeza_dash.chat_h1")}
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#c4b5fd", lineHeight: 1.55, maxWidth: 480, margin: "0 auto" }}>
          {t("limpeza_dash.chat_subtitle_part1")}{" "}
          <strong style={{ color: "#f5c860" }}>{firstName}</strong>
          {t("limpeza_dash.chat_subtitle_part2")}
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 7px #22c55e", display: "inline-block" }} aria-hidden="true" />
          <span style={{ fontSize: 14, color: "#86efac", fontWeight: 600 }}>{t("chat.online_now")}</span>
        </div>
      </div>

      {/* Contador de mensagens */}
      <div className="card-gold" style={{ padding: "14px 18px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          {t("limpeza_dash.counter_eyebrow")}
        </div>
        <div className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", fontWeight: 700, lineHeight: 1 }}>
          {remaining} <span style={{ fontSize: "1rem", color: "#9575cd" }}>{t("limpeza_dash.counter_of")} 3</span>
        </div>
      </div>

      {/* Histórico de limpezas anteriores (UX 60+ — pra revisitar) */}
      <PastLimpezasList items={pastLimpezas} />

      {/* Painel de Santos */}
      <div className="card" style={{ padding: "16px 14px", marginBottom: 20 }}>
        <div className="serif" style={{ fontSize: "1.05rem", color: "#e8b84b", textAlign: "center", marginBottom: 12 }}>
          {t("limpeza_dash.saints_panel_title")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {SAINT_DEFS.map((s) => (
            <div key={s.nameKey} style={{
              background: "rgba(232,184,75,0.08)",
              border: "1px solid rgba(232,184,75,0.25)",
              borderRadius: 12,
              padding: "10px 8px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 26, marginBottom: 4 }} aria-hidden="true">{s.icon}</div>
              <div style={{ fontSize: 11, color: "#fbf8ff", fontWeight: 600, lineHeight: 1.25, marginBottom: 2 }}>
                {t(s.nameKey)}
              </div>
              <div style={{ fontSize: 10, color: "#9575cd", lineHeight: 1.3 }}>{t(s.powerKey)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cartas espirituais */}
      {messages.length === 0 && (
        <>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <h2 className="serif" style={{ fontSize: "1.35rem", color: "#e8b84b", marginBottom: 6 }}>
              {t("limpeza_dash.cards_h2")}
            </h2>
            <p style={{ fontSize: 14, color: "#c4b5fd" }}>
              {t("limpeza_dash.cards_subtitle")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 24 }}>
            {CARD_DEFS.map((card) => (
              <button
                key={card.id}
                onClick={() => pickCard(card.id)}
                disabled={loading || remaining <= 0}
                style={{
                  background: card.color,
                  border: activeCard === card.id ? "3px solid #fff" : "2px solid rgba(255,255,255,0.2)",
                  borderRadius: 18,
                  padding: "20px 18px",
                  textAlign: "left",
                  cursor: loading ? "not-allowed" : "pointer",
                  color: "#1e0040",
                  boxShadow: activeCard === card.id
                    ? "0 0 0 4px rgba(232,184,75,0.4), 0 8px 24px rgba(0,0,0,0.3)"
                    : "0 6px 18px rgba(0,0,0,0.25)",
                  transition: "all 0.2s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 42 }} aria-hidden="true">{card.icon}</div>
                  <div>
                    <div className="serif" style={{ fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.1 }}>
                      {t(card.titleKey)}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2, fontStyle: "italic" }}>
                      ✦ {t(card.saintKey)}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, opacity: 0.92 }}>
                  {t(card.descKey)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Chat */}
      {(messages.length > 0 || streaming) && (
        <div
          ref={scrollRef}
          className="card"
          style={{
            padding: "16px 14px",
            marginBottom: 16,
            maxHeight: 460,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {streaming && <Bubble role="assistant" content={streaming} />}
          {loading && !streaming && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(232,184,75,0.08)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.2)" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#e8b84b",
                      animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span style={{ color: "#e8b84b", fontSize: 14, fontStyle: "italic" }}>
                {t("limpeza_dash.chat_consulting")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      {remaining > 0 ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("limpeza_dash.chat_placeholder")}
            disabled={loading}
            rows={3}
            style={{
              flex: 1,
              background: "#1e0040",
              border: "1px solid rgba(232,184,75,0.35)",
              borderRadius: 14,
              padding: "12px 14px",
              color: "#fbf8ff",
              fontSize: 15,
              resize: "vertical",
              fontFamily: "inherit",
              minHeight: 64,
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="btn-gold"
            style={{
              padding: "14px 22px",
              fontSize: 14,
              opacity: loading || !input.trim() ? 0.55 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "..." : t("limpeza_dash.chat_send_cta")}
          </button>
        </div>
      ) : (
        <SessionComplete firstName={firstName} />
      )}
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const { t } = useT();
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "85%",
          padding: "10px 14px",
          borderRadius: 14,
          background: isUser
            ? "linear-gradient(135deg, #4a1a7a, #6a2fa0)"
            : "linear-gradient(135deg, rgba(232,184,75,0.12), rgba(232,184,75,0.06))",
          border: isUser ? "none" : "1px solid rgba(232,184,75,0.25)",
          color: isUser ? "#fbf8ff" : "#f5f0ff",
          fontSize: 15,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {!isUser && (
          <div style={{ fontSize: 11, color: "#e8b84b", fontWeight: 700, marginBottom: 4, letterSpacing: "0.05em" }}>
            {t("limpeza_dash.bubble_atb_label")}
          </div>
        )}
        {content}
      </div>
    </div>
  );
}

const FEELING_DEFS = [
  { value: "tristeza_profunda", labelKey: "limpeza_dash.feeling_tristeza_profunda", icon: "😔" },
  { value: "ansiedade", labelKey: "limpeza_dash.feeling_ansiedade", icon: "💔" },
  { value: "raiva", labelKey: "limpeza_dash.feeling_raiva", icon: "🔥" },
  { value: "medo", labelKey: "limpeza_dash.feeling_medo", icon: "😰" },
  { value: "vazio", labelKey: "limpeza_dash.feeling_vazio", icon: "🌑" },
  { value: "inveja_alheia", labelKey: "limpeza_dash.feeling_inveja_alheia", icon: "👁️" },
  { value: "energia_pesada", labelKey: "limpeza_dash.feeling_energia_pesada", icon: "⛓️" },
  { value: "amor_bloqueado", labelKey: "limpeza_dash.feeling_amor_bloqueado", icon: "💔" },
  { value: "outro", labelKey: "limpeza_dash.feeling_outro", icon: "✨" },
] as const;

const MARITAL_DEFS = [
  { value: "solteira", labelKey: "limpeza_dash.marital_solteira" },
  { value: "casada", labelKey: "limpeza_dash.marital_casada" },
  { value: "divorciada", labelKey: "limpeza_dash.marital_divorciada" },
  { value: "viuva", labelKey: "limpeza_dash.marital_viuva" },
  { value: "uniao_estavel", labelKey: "limpeza_dash.marital_uniao_estavel" },
  { value: "outro", labelKey: "limpeza_dash.marital_outro" },
] as const;

function ProfileForm({ firstName, onSaved }: { firstName: string; onSaved: () => void }) {
  const { t } = useT();
  const [fullName, setFullName] = useState(firstName !== "querida" ? firstName : "");
  const [age, setAge] = useState<string>("");
  const [marital, setMarital] = useState("");
  const [feeling, setFeeling] = useState("");
  const [situation, setSituation] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!fullName.trim() || !age || !marital || !feeling || !situation.trim()) {
      toast.error(t("limpeza_dash.toast_fill_all"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/limpeza/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          age: Number(age),
          marital_status: marital,
          main_feeling: feeling,
          situation: situation.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || t("limpeza_dash.toast_save_error"));
        setLoading(false);
        return;
      }
      toast.success(t("limpeza_dash.toast_saved"));
      onSaved();
    } catch {
      toast.error(t("limpeza_dash.toast_connection"));
      setLoading(false);
    }
  }

  // "Começar agora": salva só o nome e cai direto no chat — a ATB pergunta o
  // resto na conversa. Mata a fricção do formulário (a causa do limpeza 0%).
  async function skip() {
    if (loading) return;
    setLoading(true);
    try {
      const name = fullName.trim().length >= 2 ? fullName.trim() : (firstName !== "querida" ? firstName : "querida alma");
      const res = await fetch("/api/limpeza/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("limpeza_dash.toast_save_error"));
        setLoading(false);
        return;
      }
      onSaved();
    } catch {
      toast.error(t("limpeza_dash.toast_connection"));
      setLoading(false);
    }
  }

  const canNext1 = fullName.trim().length >= 2 && age && Number(age) >= 13 && Number(age) <= 120 && marital;
  const canNext2 = !!feeling;
  const canSubmit = situation.trim().length >= 10;

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 620, margin: "0 auto", color: "#f5f0ff" }}>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 60, marginBottom: 12, animation: "pulse 2s infinite" }} aria-hidden="true">🕊️</div>
        <h1 className="serif" style={{ fontSize: "2rem", color: "#e8b84b", lineHeight: 1.15, marginBottom: 10 }}>
          {t("limpeza_dash.profile_h1")}
        </h1>
        <p style={{ fontSize: "1rem", color: "#c4b5fd", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>
          {t("limpeza_dash.profile_subtitle")}
        </p>
      </div>

      {/* Atalho sem fricção: começar já e contar tudo na conversa com a ATB */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <button
          onClick={skip}
          disabled={loading}
          className="btn-gold"
          style={{ width: "100%", maxWidth: 480, padding: "18px 24px", fontSize: 18, fontWeight: 800, border: "none", color: "#120025", cursor: loading ? "wait" : "pointer", borderRadius: 14 }}
        >
          {loading ? "..." : "✨ Começar minha Limpeza agora"}
        </button>
        <p style={{ color: "#9575cd", fontSize: 13, margin: "10px 0 0", lineHeight: 1.5 }}>
          Você conversa direto com a ATB e conta tudo no chat.<br />Ou preencha abaixo, se preferir personalizar.
        </p>
        <div style={{ height: 1, background: "rgba(232,184,75,0.18)", margin: "22px auto 0", maxWidth: 480 }} />
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{
            flex: 1,
            height: 6,
            borderRadius: 4,
            background: step >= n ? "#e8b84b" : "rgba(232,184,75,0.2)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {/* Step 1: Dados básicos */}
      {step === 1 && (
        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 18, textAlign: "center" }}>
            {t("limpeza_dash.profile_step1_h2")}
          </h2>

          <label style={{ display: "block", color: "#c4b5fd", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            {t("limpeza_dash.profile_step1_name_label")}
          </label>
          <input
            className="input"
            style={{ marginBottom: 16, fontSize: 16 }}
            type="text"
            placeholder={t("limpeza_dash.profile_step1_name_placeholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={60}
          />

          <label style={{ display: "block", color: "#c4b5fd", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            {t("limpeza_dash.profile_step1_age_label")}
          </label>
          <input
            className="input"
            style={{ marginBottom: 16, fontSize: 16 }}
            type="number"
            placeholder={t("limpeza_dash.profile_step1_age_placeholder")}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={13}
            max={120}
          />

          <label style={{ display: "block", color: "#c4b5fd", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {t("limpeza_dash.profile_step1_marital_label")}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
            {MARITAL_DEFS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMarital(m.value)}
                style={{
                  padding: "12px 10px",
                  background: marital === m.value ? "rgba(232,184,75,0.18)" : "rgba(196,181,253,0.05)",
                  border: marital === m.value ? "2px solid #e8b84b" : "1px solid rgba(196,181,253,0.2)",
                  borderRadius: 12,
                  color: marital === m.value ? "#fbf8ff" : "#c4b5fd",
                  fontSize: 14,
                  fontWeight: marital === m.value ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canNext1}
            className="btn-gold w-full"
            style={{
              padding: "16px",
              fontSize: "1.05rem",
              marginTop: 22,
              opacity: canNext1 ? 1 : 0.5,
              cursor: canNext1 ? "pointer" : "not-allowed",
            }}
          >
            {t("limpeza_dash.profile_next")}
          </button>
        </div>
      )}

      {/* Step 2: Sentimento */}
      {step === 2 && (
        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 8, textAlign: "center" }}>
            {t("limpeza_dash.profile_step2_h2")}
          </h2>
          <p style={{ fontSize: 14, color: "#c4b5fd", textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
            {t("limpeza_dash.profile_step2_subtitle")}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
            {FEELING_DEFS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFeeling(f.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: feeling === f.value ? "rgba(232,184,75,0.18)" : "rgba(196,181,253,0.05)",
                  border: feeling === f.value ? "2px solid #e8b84b" : "1px solid rgba(196,181,253,0.2)",
                  borderRadius: 12,
                  color: feeling === f.value ? "#fbf8ff" : "#c4b5fd",
                  fontSize: 15,
                  fontWeight: feeling === f.value ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 24 }} aria-hidden="true">{f.icon}</span>
                <span>{t(f.labelKey)}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: "16px 22px",
                background: "rgba(196,181,253,0.1)",
                border: "1px solid rgba(196,181,253,0.3)",
                color: "#c4b5fd",
                borderRadius: 999,
                fontSize: 15,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {t("limpeza_dash.profile_back")}
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canNext2}
              className="btn-gold"
              style={{
                flex: 1,
                padding: "16px",
                fontSize: "1.05rem",
                opacity: canNext2 ? 1 : 0.5,
                cursor: canNext2 ? "pointer" : "not-allowed",
              }}
            >
              {t("limpeza_dash.profile_next")}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Situação */}
      {step === 3 && (
        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 8, textAlign: "center" }}>
            {t("limpeza_dash.profile_step3_h2")}
          </h2>
          <p style={{ fontSize: 14, color: "#c4b5fd", textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
            {t("limpeza_dash.profile_step3_subtitle")}
          </p>

          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder={t("limpeza_dash.profile_step3_placeholder")}
            rows={7}
            maxLength={500}
            style={{
              width: "100%",
              background: "#1e0040",
              border: "1px solid rgba(232,184,75,0.35)",
              borderRadius: 14,
              padding: "14px 16px",
              color: "#fbf8ff",
              fontSize: 15,
              lineHeight: 1.6,
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 120,
            }}
          />
          <div style={{ fontSize: 12, color: "#9575cd", textAlign: "right", marginTop: 4 }}>
            {situation.length}/500
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              style={{
                padding: "16px 22px",
                background: "rgba(196,181,253,0.1)",
                border: "1px solid rgba(196,181,253,0.3)",
                color: "#c4b5fd",
                borderRadius: 999,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {t("limpeza_dash.profile_back")}
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit || loading}
              className="btn-gold"
              style={{
                flex: 1,
                padding: "16px",
                fontSize: "1.05rem",
                opacity: canSubmit && !loading ? 1 : 0.5,
                cursor: canSubmit && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? t("limpeza_dash.profile_submit_loading") : t("limpeza_dash.profile_submit_cta")}
            </button>
          </div>
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 12, color: "#9575cd", marginTop: 18, lineHeight: 1.55 }}>
        {t("limpeza_dash.profile_privacy")}
      </p>
    </div>
  );
}

function SessionComplete({ firstName }: { firstName: string }) {
  const { t } = useT();
  const VIDEO_URL = "/api/checkout/videochamada"; // roteador BR/intl

  return (
    <div className="card-gold" style={{ padding: "28px 22px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 12 }} aria-hidden="true">🙏</div>

      <h2 className="serif" style={{ fontSize: "1.5rem", color: "#e8b84b", marginBottom: 10 }}>
        {t("limpeza_dash.complete_h2_part1")} {firstName}
      </h2>

      <p style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.7, marginBottom: 16, maxWidth: 460, margin: "0 auto 16px" }}>
        {t("limpeza_dash.complete_desc")}
      </p>

      <p style={{ fontSize: 14, color: "#c4b5fd", lineHeight: 1.6, marginBottom: 22, fontStyle: "italic" }}>
        {t("limpeza_dash.complete_blessing")}
      </p>

      {/* Upsell vídeo chamada */}
      <div style={{ background: "linear-gradient(135deg,#3b0764,#2a0055)", border: "1.5px solid rgba(232,184,75,0.5)", borderRadius: 16, padding: "20px 18px", marginTop: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">📞</div>
        <h3 className="serif" style={{ fontSize: "1.25rem", color: "#e8b84b", marginBottom: 8 }}>
          {t("limpeza_dash.video_upsell_h3")}
        </h3>
        <p style={{ fontSize: 14, color: "#d9cdfc", lineHeight: 1.6, marginBottom: 16 }}>
          {t("limpeza_dash.video_upsell_desc")}
        </p>
        <a
          href={VIDEO_URL}
          className="btn-gold"
          style={{ display: "inline-block", padding: "12px 24px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}
        >
          {t("limpeza_dash.video_upsell_cta")}
        </a>
      </div>

      <Link
        href="/dashboard"
        style={{
          display: "inline-block",
          marginTop: 18,
          color: "#c4b5fd",
          fontSize: 14,
          textDecoration: "underline",
        }}
      >
        {t("limpeza_dash.back_to_panel")}
      </Link>
    </div>
  );
}

function ConfirmingPurchase({ firstName }: { firstName: string }) {
  const router = useRouter();
  const { t } = useT();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Faz refresh a cada 4 segundos para verificar se o webhook chegou
    const tick = setInterval(() => {
      setSeconds((s) => s + 4);
      router.refresh();
    }, 4000);
    return () => clearInterval(tick);
  }, [router]);

  return (
    <div style={{ padding: "60px 20px", maxWidth: 560, margin: "0 auto", color: "#f5f0ff", textAlign: "center", minHeight: "70vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s ease-in-out infinite" }} aria-hidden="true">🕊️</div>

      <h1 className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", lineHeight: 1.2, marginBottom: 16 }}>
        {t("limpeza_dash.confirming_h1")}
      </h1>

      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
        <strong style={{ color: "#f5c860" }}>{firstName}</strong>{t("limpeza_dash.confirming_subtitle_part2")}
      </p>

      <div className="card-gold" style={{ padding: "22px 20px", marginBottom: 22 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }} aria-hidden="true">✨</div>
        <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.7, margin: 0 }}>
          {t("limpeza_dash.confirming_card_part1")}{" "}
          <strong style={{ color: "#f5c860" }}>{t("limpeza_dash.confirming_card_part2")}</strong>.
          <br />
          {t("limpeza_dash.confirming_card_part3")}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#e8b84b",
              animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <p style={{ fontSize: 14, color: "#9575cd", lineHeight: 1.6 }}>
        {t("limpeza_dash.confirming_autoreload")}
      </p>

      {seconds >= 30 && (
        <div style={{ marginTop: 24, padding: "14px 18px", background: "rgba(232,184,75,0.1)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.3)" }}>
          <p style={{ fontSize: 14, color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
            {t("limpeza_dash.confirming_slow")}
          </p>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}

function PurchaseGate({ firstName, kiwifyUrl }: { firstName: string; kiwifyUrl: string }) {
  const { t } = useT();
  const cardImgs = [
    { img: "/img/carta-limpeza.png", titleKey: "limpeza_dash.card_limpeza_title" },
    { img: "/img/carta-caminhos.png", titleKey: "limpeza_dash.card_caminhos_title" },
    { img: "/img/carta-protecao.png", titleKey: "limpeza_dash.card_protecao_title" },
  ] as const;
  const benefits = [
    { icon: "🕯️", key: "limpeza_dash.gate_bullet1" },
    { icon: "🗝️", key: "limpeza_dash.gate_bullet2" },
    { icon: "👑", key: "limpeza_dash.gate_bullet3" },
    { icon: "💧", key: "limpeza_dash.gate_bullet4" },
    { icon: "⚔️", key: "limpeza_dash.gate_bullet5" },
    { icon: "✨", key: "limpeza_dash.gate_bullet6" },
  ] as const;

  return (
    <div style={{ padding: "32px 20px 80px", maxWidth: 620, margin: "0 auto", color: "#f5f0ff" }}>
      {/* Imagem real do altar */}
      <div style={{ borderRadius: 22, overflow: "hidden", marginBottom: 22, boxShadow: "0 18px 50px rgba(232,184,75,0.25), 0 0 0 2px rgba(232,184,75,0.4)" }}>
        <Image
          src="/img/limpeza-altar.png"
          alt={t("thanks.altar_alt")}
          width={1536}
          height={1024}
          priority
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 className="serif" style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 12 }}>
          {t("limpeza_dash.gate_h1")}
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, maxWidth: 500, margin: "0 auto", fontWeight: 500 }}>
          {firstName}{t("limpeza_dash.gate_subtitle_part2")}
        </p>
      </div>

      {/* Preview das cartas reais (borradas) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24, filter: "blur(3px) brightness(0.65)" }}>
        {cardImgs.map((c) => (
          <div key={c.titleKey} style={{
            borderRadius: 14,
            overflow: "hidden",
            aspectRatio: "1 / 1",
            border: "2px solid rgba(232,184,75,0.5)",
          }}>
            <Image src={c.img} alt={t(c.titleKey)} width={400} height={400} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>

      {/* Pacote de benefícios */}
      <div className="card" style={{ padding: "20px 22px", marginBottom: 20 }}>
        <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", textAlign: "center", marginBottom: 14 }}>
          {t("limpeza_dash.gate_benefits_h2")}
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {benefits.map((b, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", fontSize: 15, color: "#d9cdfc", lineHeight: 1.55 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden="true">{b.icon}</span>
              <span>{t(b.key)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Santos com imagem real */}
      <div className="card-gold" style={{ padding: "16px", marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 600 }}>
          {t("landing.saints_title")}
        </div>
        <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
          <Image
            src="/img/santos-grid.png"
            alt={t("limpeza_dash.gate_saints_alt")}
            width={1536}
            height={1024}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
        <div style={{ fontSize: 11, color: "#fbf8ff", lineHeight: 1.5, opacity: 0.85 }}>
          {t("limpeza_dash.gate_saints_names_line1")}<br />
          {t("limpeza_dash.gate_saints_names_line2")}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        background: "linear-gradient(135deg, #2a0055 0%, #4a1a7a 50%, #2a0055 100%)",
        border: "2px solid rgba(232,184,75,0.5)",
        borderRadius: 18,
        padding: "26px 22px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 12, color: "#f5c860", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          {t("limpeza_dash.gate_cta_eyebrow")}
        </div>
        <div className="serif" style={{ fontSize: "3rem", color: "#e8b84b", fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
          {t("landing.limpeza_price")}
        </div>
        <div style={{ fontSize: 13, color: "#9575cd", marginBottom: 18 }}>
          {t("limpeza_dash.gate_cta_subtitle")}
        </div>
        <a
          href={kiwifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold"
          style={{ display: "inline-block", padding: "16px 32px", fontSize: "1.05rem", fontWeight: 700 }}
        >
          {t("limpeza_dash.gate_cta")}
        </a>
        <p style={{ fontSize: 12, color: "#9575cd", marginTop: 14, lineHeight: 1.5 }}>
          {t("limpeza_dash.gate_secure")}
        </p>
      </div>
    </div>
  );
}

function PastLimpezasList({ items }: { items: PastLimpeza[] }) {
  const { t } = useT();
  if (!items.length) return null;

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: "20px 18px",
        marginBottom: 20,
        background: "linear-gradient(135deg, rgba(232,184,75,0.08), rgba(126,232,248,0.04))",
        border: "1.5px solid rgba(232,184,75,0.32)",
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: "1.25rem",
          color: "#e8b84b",
          fontWeight: 700,
          marginBottom: 14,
          textAlign: "center",
          lineHeight: 1.25,
        }}
      >
        {t("limpeza_dash.history_title")}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((it) => (
          <div
            key={it.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              background: "rgba(18,0,37,0.5)",
              borderRadius: 12,
              border: "1px solid rgba(232,184,75,0.25)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 14, color: "#c4b5fd", lineHeight: 1.4, fontWeight: 500 }}>
                {t("limpeza_dash.history_date_prefix")}
              </div>
              <div style={{ fontSize: 18, color: "#fbf8ff", fontWeight: 700, lineHeight: 1.3 }}>
                {formatDate(it.createdAt)}
              </div>
            </div>
            <Link
              href={`/entrega/${it.id}`}
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #e8b84b, #c9950a)",
                color: "#120025",
                fontWeight: 800,
                fontSize: 16,
                padding: "14px 20px",
                borderRadius: 12,
                textDecoration: "none",
                minHeight: 52,
                boxShadow: "0 6px 16px rgba(232,184,75,0.3)",
              }}
            >
              {t("limpeza_dash.history_open_again")}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
