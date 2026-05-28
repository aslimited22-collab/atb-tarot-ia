"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { BackButton } from "@/components/BackButton";
import { useT } from "@/lib/i18n/I18nProvider";

type Msg = { id?: string; role: string; content: string };

// Mesma lógica do /dashboard/chat e /limpeza: typing simulation pra ATB
// "respirar" entre palavras como uma médium falando ao telefone.
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

const MENTOR_DEFS = [
  { icon: "👼", nameKey: "espirito_dash.mentor1_name", powerKey: "espirito_dash.mentor1_power" },
  { icon: "🪶", nameKey: "espirito_dash.mentor2_name", powerKey: "espirito_dash.mentor2_power" },
  { icon: "🕯️", nameKey: "espirito_dash.mentor3_name", powerKey: "espirito_dash.mentor3_power" },
  { icon: "✨", nameKey: "espirito_dash.mentor4_name", powerKey: "espirito_dash.mentor4_power" },
  { icon: "👑", nameKey: "espirito_dash.mentor5_name", powerKey: "espirito_dash.mentor5_power" },
  { icon: "🌊", nameKey: "espirito_dash.mentor6_name", powerKey: "espirito_dash.mentor6_power" },
] as const;

const LOST_OPTION_DEFS = [
  { value: "mae", labelKey: "espirito_dash.lost_mae", icon: "👵" },
  { value: "pai", labelKey: "espirito_dash.lost_pai", icon: "👴" },
  { value: "marido_esposa", labelKey: "espirito_dash.lost_marido_esposa", icon: "💑" },
  { value: "filho", labelKey: "espirito_dash.lost_filho", icon: "👶" },
  { value: "irmao", labelKey: "espirito_dash.lost_irmao", icon: "👫" },
  { value: "avo", labelKey: "espirito_dash.lost_avo", icon: "🌹" },
  { value: "amigo", labelKey: "espirito_dash.lost_amigo", icon: "🤝" },
  { value: "outro", labelKey: "espirito_dash.lost_outro", icon: "💛" },
  { value: "ninguem", labelKey: "espirito_dash.lost_ninguem", icon: "🕊️" },
] as const;

export default function EspiritoMentorClient({
  purchased,
  justPurchased,
  firstName,
  kiwifyUrl,
  initialMessages,
  initialRemaining,
  hasProfile,
}: {
  purchased: boolean;
  justPurchased?: boolean;
  firstName: string;
  kiwifyUrl: string;
  initialMessages: Msg[];
  initialRemaining: number;
  hasProfile?: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  if (!purchased && justPurchased) return <ConfirmingPurchase firstName={firstName} />;
  if (!purchased) return <PurchaseGate firstName={firstName} kiwifyUrl={kiwifyUrl} />;
  if (!hasProfile) return <ProfileForm firstName={firstName} onSaved={() => router.refresh()} />;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || remaining <= 0) return;

    setLoading(true);
    setStreaming("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");

    try {
      const res = await fetch("/api/espirito-mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || `${t("limpeza_dash.toast_error_prefix")} ${res.status}`);
        setMessages((m) => m.slice(0, -1));
        setLoading(false);
        return;
      }

      // Acumula resposta inteira, depois typeOut pra simular digitação humana.
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

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 760, margin: "0 auto", color: "#f5f0ff" }}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>

      <BackButton />

      {/* Header sagrado */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 56, marginBottom: 10 }} aria-hidden="true">🕯️</div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem, 5vw, 2.4rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 6, fontWeight: 700 }}>
          {t("espirito_dash.chat_h1")}
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#fbf8ff", lineHeight: 1.55, maxWidth: 480, margin: "0 auto", fontWeight: 500 }}>
          {t("espirito_dash.chat_subtitle_part1")}{" "}
          <strong style={{ color: "#f5c860" }}>{firstName}</strong>
          {t("espirito_dash.chat_subtitle_part2")}
        </p>
      </div>

      {/* Contador */}
      <div className="card-gold" style={{ padding: "16px 18px", textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          {t("limpeza_dash.counter_eyebrow")}
        </div>
        <div className="serif" style={{ fontSize: "2.4rem", color: "#e8b84b", fontWeight: 700, lineHeight: 1 }}>
          {remaining} <span style={{ fontSize: "1rem", color: "#9575cd" }}>{t("limpeza_dash.counter_of")} 3</span>
        </div>
      </div>

      {/* Chat */}
      {(messages.length > 0 || streaming) && (
        <div
          ref={scrollRef}
          className="card"
          style={{
            padding: "16px 14px",
            marginBottom: 16,
            maxHeight: 520,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
          {streaming && <Bubble role="assistant" content={streaming} />}
          {loading && !streaming && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(232,184,75,0.1)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.25)" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 9, height: 9, borderRadius: "50%", background: "#e8b84b",
                    animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              <span style={{ color: "#e8b84b", fontSize: 15, fontStyle: "italic" }}>
                {t("espirito_dash.chat_consulting")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {messages.length === 0 && !streaming && !loading && (
        <div className="card" style={{ padding: "24px 22px", marginBottom: 18, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }} aria-hidden="true">🕊️</div>
          <h2 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 10 }}>
            {t("espirito_dash.empty_h2")}
          </h2>
          <p style={{ fontSize: 16, color: "#fbf8ff", lineHeight: 1.6, fontWeight: 500 }}>
            {t("espirito_dash.empty_desc_line1")}<br />
            {t("espirito_dash.empty_desc_line2")}
          </p>
        </div>
      )}

      {/* Input */}
      {remaining > 0 ? (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("espirito_dash.chat_placeholder")}
            disabled={loading}
            rows={3}
            style={{
              flex: 1,
              background: "#1e0040",
              border: "2px solid rgba(232,184,75,0.35)",
              borderRadius: 14,
              padding: "14px 16px",
              color: "#fbf8ff",
              fontSize: 16,
              resize: "vertical",
              fontFamily: "inherit",
              minHeight: 70,
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="btn-gold"
            style={{
              padding: "16px 22px",
              fontSize: 15,
              opacity: loading || !input.trim() ? 0.55 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              border: "none",
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
          maxWidth: "88%",
          padding: "12px 16px",
          borderRadius: 14,
          background: isUser
            ? "linear-gradient(135deg, #4a1a7a, #6a2fa0)"
            : "linear-gradient(135deg, rgba(232,184,75,0.14), rgba(232,184,75,0.07))",
          border: isUser ? "none" : "1px solid rgba(232,184,75,0.3)",
          color: isUser ? "#fbf8ff" : "#f5f0ff",
          fontSize: 16,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
        }}
      >
        {!isUser && (
          <div style={{ fontSize: 11, color: "#e8b84b", fontWeight: 700, marginBottom: 4, letterSpacing: "0.05em" }}>
            {t("espirito_dash.bubble_atb_label")}
          </div>
        )}
        {content}
      </div>
    </div>
  );
}

function ProfileForm({ firstName, onSaved }: { firstName: string; onSaved: () => void }) {
  const { t } = useT();
  const [fullName, setFullName] = useState(firstName !== "querida" ? firstName : "");
  const [age, setAge] = useState<string>("");
  const [lost, setLost] = useState("");
  const [who, setWho] = useState("");
  const [question, setQuestion] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!fullName.trim() || !age || !lost || !question.trim()) {
      toast.error(t("limpeza_dash.toast_fill_all"));
      return;
    }
    if (lost !== "ninguem" && !who.trim()) {
      toast.error(t("espirito_dash.toast_need_name"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/espirito-mentor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          age: Number(age),
          lost_loved_one: lost,
          who_to_talk: who.trim(),
          main_question: question.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || t("limpeza_dash.toast_save_error"));
        setLoading(false);
        return;
      }
      toast.success(t("espirito_dash.toast_saved"));
      onSaved();
    } catch {
      toast.error(t("limpeza_dash.toast_connection"));
      setLoading(false);
    }
  }

  const canNext1 = fullName.trim().length >= 2 && age && Number(age) >= 13 && Number(age) <= 120;
  const canNext2 = !!lost && (lost === "ninguem" || who.trim().length >= 2);
  const canSubmit = question.trim().length >= 10;

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 620, margin: "0 auto", color: "#f5f0ff" }}>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`}</style>
      <BackButton />

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 60, marginBottom: 12, animation: "pulse 2s infinite" }} aria-hidden="true">🕯️</div>
        <h1 className="serif" style={{ fontSize: "2rem", color: "#e8b84b", lineHeight: 1.15, marginBottom: 10, fontWeight: 700 }}>
          {t("espirito_dash.profile_h1")}
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.6, maxWidth: 480, margin: "0 auto", fontWeight: 500 }}>
          {t("espirito_dash.profile_subtitle")}
        </p>
      </div>

      {/* Progresso */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[1, 2, 3].map((n) => (
          <div key={n} style={{
            flex: 1, height: 6, borderRadius: 4,
            background: step >= n ? "#e8b84b" : "rgba(232,184,75,0.2)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 18, textAlign: "center" }}>
            {t("limpeza_dash.profile_step1_h2")}
          </h2>
          <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            {t("limpeza_dash.profile_step1_name_label")}
          </label>
          <input
            className="input input-big"
            style={{ marginBottom: 18 }}
            type="text"
            placeholder={t("limpeza_dash.profile_step1_name_placeholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={60}
          />
          <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            {t("limpeza_dash.profile_step1_age_label")}
          </label>
          <input
            className="input input-big"
            style={{ marginBottom: 24 }}
            type="number"
            placeholder={t("limpeza_dash.profile_step1_age_placeholder")}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={13}
            max={120}
          />
          <button
            onClick={() => setStep(2)}
            disabled={!canNext1}
            className="btn-gold btn-big"
            style={{
              width: "100%",
              opacity: canNext1 ? 1 : 0.5,
              cursor: canNext1 ? "pointer" : "not-allowed",
              border: "none",
            }}
          >
            {t("limpeza_dash.profile_next")}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 8, textAlign: "center" }}>
            {t("espirito_dash.profile_step2_h2")}
          </h2>
          <p style={{ fontSize: 14, color: "#c4b5fd", textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
            {t("espirito_dash.profile_step2_subtitle")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 18 }}>
            {LOST_OPTION_DEFS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setLost(o.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px",
                  background: lost === o.value ? "rgba(232,184,75,0.18)" : "rgba(196,181,253,0.05)",
                  border: lost === o.value ? "2px solid #e8b84b" : "1px solid rgba(196,181,253,0.2)",
                  borderRadius: 12,
                  color: lost === o.value ? "#fbf8ff" : "#c4b5fd",
                  fontSize: 15,
                  fontWeight: lost === o.value ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 24 }} aria-hidden="true">{o.icon}</span>
                <span>{t(o.labelKey)}</span>
              </button>
            ))}
          </div>

          {lost && lost !== "ninguem" && (
            <>
              <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {t("espirito_dash.profile_who_label")}
              </label>
              <input
                className="input input-big"
                style={{ marginBottom: 8 }}
                type="text"
                placeholder={t("espirito_dash.profile_who_placeholder")}
                value={who}
                onChange={(e) => setWho(e.target.value)}
                maxLength={80}
              />
              <p className="help-hint" style={{ marginBottom: 18 }}>
                {t("espirito_dash.profile_who_hint")}
              </p>
            </>
          )}

          <div style={{ display: "flex", gap: 10 }}>
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
                border: "none",
              }}
            >
              {t("limpeza_dash.profile_next")}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 8, textAlign: "center" }}>
            {t("espirito_dash.profile_step3_h2")}
          </h2>
          <p style={{ fontSize: 14, color: "#c4b5fd", textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
            {t("espirito_dash.profile_step3_subtitle")}
          </p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("espirito_dash.profile_step3_placeholder")}
            rows={7}
            maxLength={500}
            style={{
              width: "100%",
              background: "#1e0040",
              border: "2px solid rgba(232,184,75,0.35)",
              borderRadius: 14,
              padding: "14px 16px",
              color: "#fbf8ff",
              fontSize: 16,
              lineHeight: 1.6,
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 130,
            }}
          />
          <div style={{ fontSize: 12, color: "#9575cd", textAlign: "right", marginTop: 4 }}>
            {question.length}/500
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
                border: "none",
              }}
            >
              {loading ? t("espirito_dash.profile_submit_loading") : t("espirito_dash.profile_submit_cta")}
            </button>
          </div>
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 12, color: "#9575cd", marginTop: 18, lineHeight: 1.55 }}>
        {t("espirito_dash.profile_privacy")}
      </p>
    </div>
  );
}

function SessionComplete({ firstName }: { firstName: string }) {
  const { t } = useT();
  const VIDEO_URL = "/api/checkout/videochamada"; // roteador BR/intl
  return (
    <div className="card-gold" style={{ padding: "28px 22px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 12 }} aria-hidden="true">🕊️</div>
      <h2 className="serif" style={{ fontSize: "1.5rem", color: "#e8b84b", marginBottom: 10 }}>
        {t("espirito_dash.complete_h2_part1")} {firstName}
      </h2>
      <p style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.7, marginBottom: 16, maxWidth: 460, margin: "0 auto 16px" }}>
        {t("espirito_dash.complete_desc")}
      </p>
      <p style={{ fontSize: 14, color: "#c4b5fd", lineHeight: 1.6, marginBottom: 22, fontStyle: "italic" }}>
        {t("espirito_dash.complete_blessing")}
      </p>

      <div style={{ background: "linear-gradient(135deg,#3b0764,#2a0055)", border: "1.5px solid rgba(232,184,75,0.5)", borderRadius: 16, padding: "20px 18px", marginTop: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">📞</div>
        <h3 className="serif" style={{ fontSize: "1.25rem", color: "#e8b84b", marginBottom: 8 }}>
          {t("limpeza_dash.video_upsell_h3")}
        </h3>
        <p style={{ fontSize: 14, color: "#d9cdfc", lineHeight: 1.6, marginBottom: 16 }}>
          {t("espirito_dash.video_upsell_desc")}
        </p>
        <a href={VIDEO_URL} className="btn-gold" style={{ display: "inline-block", padding: "12px 24px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
          {t("limpeza_dash.video_upsell_cta")}
        </a>
      </div>

      <Link href="/dashboard" style={{ display: "inline-block", marginTop: 18, color: "#c4b5fd", fontSize: 14, textDecoration: "underline" }}>
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
    const tick = setInterval(() => {
      setSeconds((s) => s + 4);
      router.refresh();
    }, 4000);
    return () => clearInterval(tick);
  }, [router]);

  return (
    <div style={{ padding: "60px 20px", maxWidth: 560, margin: "0 auto", color: "#f5f0ff", textAlign: "center", minHeight: "70vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.5} 40%{transform:translateY(-10px);opacity:1} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      `}</style>
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }} aria-hidden="true">🕯️</div>
      <h1 className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", lineHeight: 1.2, marginBottom: 16 }}>
        {t("limpeza_dash.confirming_h1")}
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
        <strong style={{ color: "#f5c860" }}>{firstName}</strong>{t("espirito_dash.confirming_subtitle_part2")}
      </p>
      <div className="card-gold" style={{ padding: "22px 20px", marginBottom: 22 }}>
        <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.7, margin: 0 }}>
          {t("espirito_dash.confirming_card")}
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: "#e8b84b", animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <p style={{ fontSize: 14, color: "#9575cd", lineHeight: 1.6 }}>
        {t("limpeza_dash.confirming_autoreload")}
      </p>
      {seconds >= 30 && (
        <div style={{ marginTop: 24, padding: "14px 18px", background: "rgba(232,184,75,0.1)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.3)" }}>
          <p style={{ fontSize: 14, color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
            {t("espirito_dash.confirming_slow_short")}
          </p>
        </div>
      )}
    </div>
  );
}

function PurchaseGate({ firstName, kiwifyUrl }: { firstName: string; kiwifyUrl: string }) {
  const { t } = useT();
  const benefits = [
    { icon: "✨", key: "espirito_dash.gate_bullet1" },
    { icon: "🕊️", key: "espirito_dash.gate_bullet2" },
    { icon: "💫", key: "espirito_dash.gate_bullet3" },
    { icon: "🌹", key: "espirito_dash.gate_bullet4" },
    { icon: "🙏", key: "espirito_dash.gate_bullet5" },
  ] as const;
  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 620, margin: "0 auto", color: "#f5f0ff" }}>
      <BackButton />

      {/* Headline impactante */}
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: 72, marginBottom: 12 }} aria-hidden="true">🕯️</div>
        <div style={{ fontSize: 13, color: "#f5c860", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10, textTransform: "uppercase" }}>
          {t("espirito_dash.gate_eyebrow")}
        </div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem, 5.5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.1, marginBottom: 14, fontWeight: 700 }}>
          {t("espirito_dash.gate_h1_line1")}<br />{t("espirito_dash.gate_h1_line2")}
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.55, maxWidth: 500, margin: "0 auto", fontWeight: 600 }}>
          {t("espirito_dash.gate_subhead_line1")}<br />{t("espirito_dash.gate_subhead_line2")}
        </p>
      </div>

      {/* Subheadline emocional */}
      <p style={{ fontSize: 17, color: "#d9cdfc", lineHeight: 1.7, marginBottom: 24, textAlign: "center", padding: "0 8px", fontWeight: 500 }}>
        {t("espirito_dash.gate_emotional_part1")}<br />
        <strong style={{ color: "#f5c860" }}>{t("espirito_dash.gate_emotional_part2")}</strong>.
      </p>

      {/* O que você recebe */}
      <div className="card-gold" style={{ padding: "26px 22px", marginBottom: 22 }}>
        <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", textAlign: "center", marginBottom: 18, fontWeight: 700 }}>
          {t("espirito_dash.gate_benefits_h2")}
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {benefits.map((b, i) => (
            <li key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", fontSize: 16, color: "#fbf8ff", lineHeight: 1.5, fontWeight: 500 }}>
              <span style={{ fontSize: 26, flexShrink: 0 }} aria-hidden="true">{b.icon}</span>
              <span>{t(b.key)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mentores espirituais */}
      <div className="card" style={{ padding: "20px 18px", marginBottom: 22, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 600 }}>
          {t("espirito_dash.gate_mentors_title")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {MENTOR_DEFS.map((m) => (
            <div key={m.nameKey} style={{
              background: "rgba(232,184,75,0.08)",
              border: "1px solid rgba(232,184,75,0.25)",
              borderRadius: 12,
              padding: "12px 8px",
            }}>
              <div style={{ fontSize: 32, marginBottom: 6 }} aria-hidden="true">{m.icon}</div>
              <div style={{ fontSize: 12, color: "#fbf8ff", fontWeight: 700, lineHeight: 1.25, marginBottom: 4 }}>
                {t(m.nameKey)}
              </div>
              <div style={{ fontSize: 11, color: "#c4b5fd", lineHeight: 1.3 }}>{t(m.powerKey)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        background: "linear-gradient(135deg, #2a0055 0%, #4a1a7a 50%, #2a0055 100%)",
        border: "3px solid rgba(232,184,75,0.6)",
        borderRadius: 22,
        padding: "32px 24px",
        textAlign: "center",
        boxShadow: "0 16px 50px rgba(232,184,75,0.22)",
      }}>
        <div style={{ fontSize: 14, color: "#f5c860", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6, fontWeight: 700 }}>
          {t("espirito_dash.gate_cta_eyebrow")}
        </div>
        <div className="serif" style={{ fontSize: "clamp(3rem, 8vw, 4rem)", color: "#e8b84b", fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
          {t("plans.espirito_price")}
        </div>
        <div style={{ fontSize: 15, color: "#fbf8ff", marginBottom: 24, fontWeight: 500 }}>
          {t("espirito_dash.gate_cta_once")}
        </div>
        <a
          href={kiwifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold btn-big"
          style={{
            display: "block",
            textDecoration: "none",
            width: "100%",
            maxWidth: 460,
            margin: "0 auto",
            border: "none",
            color: "#120025",
          }}
        >
          {t("espirito_dash.gate_cta_btn")}
        </a>
        <div style={{ marginTop: 18, padding: "14px 16px", background: "rgba(232,184,75,0.08)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.25)" }}>
          <p style={{ fontSize: 14, color: "#fbf8ff", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            🔒 <strong>{t("espirito_dash.gate_secure_h")}</strong> · {t("espirito_dash.gate_secure_methods")}<br />
            {t("espirito_dash.gate_secure_delivery")}
          </p>
        </div>
      </div>
    </div>
  );
}
