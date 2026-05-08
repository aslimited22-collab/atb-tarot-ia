"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { BackButton } from "@/components/BackButton";

type Msg = { id?: string; role: string; content: string };

const MENTORS = [
  { icon: "👼", name: "Anjo da Guarda", power: "Te protege desde o nascimento" },
  { icon: "🪶", name: "Caboclo", power: "Força da natureza, cura" },
  { icon: "🕯️", name: "Preto Velho", power: "Sabedoria e consolação" },
  { icon: "✨", name: "Mentor de Luz", power: "Guia evolutivo da alma" },
  { icon: "👑", name: "Nossa Senhora", power: "Mãe que conforta a dor" },
  { icon: "🌊", name: "Iemanjá", power: "Lava a saudade" },
];

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
        toast.error(data.error || `Erro ${res.status}`);
        setMessages((m) => m.slice(0, -1));
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }
      setMessages((m) => [...m, { role: "assistant", content: acc }]);
      setStreaming("");
      setRemaining((r) => Math.max(0, r - 1));
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
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
        <div style={{ fontSize: 56, marginBottom: 10 }}>🕯️</div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem, 5vw, 2.4rem)", color: "#e8b84b", lineHeight: 1.15, marginBottom: 6, fontWeight: 700 }}>
          Sessão Espírita
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#fbf8ff", lineHeight: 1.55, maxWidth: 480, margin: "0 auto", fontWeight: 500 }}>
          Olá, <strong style={{ color: "#f5c860" }}>{firstName}</strong>. Seu mentor espiritual está aqui.
        </p>
      </div>

      {/* Contador */}
      <div className="card-gold" style={{ padding: "16px 18px", textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Mensagens sagradas restantes
        </div>
        <div className="serif" style={{ fontSize: "2.4rem", color: "#e8b84b", fontWeight: 700, lineHeight: 1 }}>
          {remaining} <span style={{ fontSize: "1rem", color: "#9575cd" }}>de 3</span>
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
                ATB está conectando com o outro lado...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Estado vazio */}
      {messages.length === 0 && !streaming && !loading && (
        <div className="card" style={{ padding: "24px 22px", marginBottom: 18, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🕊️</div>
          <h2 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 10 }}>
            Estou aqui, minha querida alma
          </h2>
          <p style={{ fontSize: 16, color: "#fbf8ff", lineHeight: 1.6, fontWeight: 500 }}>
            Faça sua primeira pergunta para o outro lado.<br />
            Pode falar com o coração aberto.
          </p>
        </div>
      )}

      {/* Input */}
      {remaining > 0 ? (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao seu mentor espiritual..."
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
            {loading ? "..." : "✨ Enviar"}
          </button>
        </div>
      ) : (
        <SessionComplete firstName={firstName} />
      )}
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
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
            🕯️ ATB · Médium
          </div>
        )}
        {content}
      </div>
    </div>
  );
}

function ProfileForm({ firstName, onSaved }: { firstName: string; onSaved: () => void }) {
  const [fullName, setFullName] = useState(firstName !== "querida" ? firstName : "");
  const [age, setAge] = useState<string>("");
  const [lost, setLost] = useState("");
  const [who, setWho] = useState("");
  const [question, setQuestion] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const LOST_OPTIONS = [
    { value: "mae", label: "Minha mãe", icon: "👵" },
    { value: "pai", label: "Meu pai", icon: "👴" },
    { value: "marido_esposa", label: "Meu marido/esposa", icon: "💑" },
    { value: "filho", label: "Meu filho/filha", icon: "👶" },
    { value: "irmao", label: "Meu irmão/irmã", icon: "👫" },
    { value: "avo", label: "Meu avô/avó", icon: "🌹" },
    { value: "amigo", label: "Um amigo querido", icon: "🤝" },
    { value: "outro", label: "Outra pessoa que amava", icon: "💛" },
    { value: "ninguem", label: "Ninguém — quero falar com meu guia", icon: "🕊️" },
  ];

  async function submit() {
    if (!fullName.trim() || !age || !lost || !question.trim()) {
      toast.error("Por favor preencha tudo, minha querida.");
      return;
    }
    if (lost !== "ninguem" && !who.trim()) {
      toast.error("Por favor escreva o nome dessa pessoa.");
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
        toast.error(data.error || "Erro ao salvar.");
        setLoading(false);
        return;
      }
      toast.success("Dados recebidos. Seu mentor já vem.");
      onSaved();
    } catch {
      toast.error("Erro de conexão.");
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
        <div style={{ fontSize: 60, marginBottom: 12, animation: "pulse 2s infinite" }}>🕯️</div>
        <h1 className="serif" style={{ fontSize: "2rem", color: "#e8b84b", lineHeight: 1.15, marginBottom: 10, fontWeight: 700 }}>
          Antes da sessão começar
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.6, maxWidth: 480, margin: "0 auto", fontWeight: 500 }}>
          Me conte um pouquinho sobre você e quem você quer alcançar do outro lado, minha querida alma.
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
            Quem é você
          </h2>
          <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Como posso te chamar?
          </label>
          <input
            className="input input-big"
            style={{ marginBottom: 18 }}
            type="text"
            placeholder="Seu nome"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={60}
          />
          <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Sua idade
          </label>
          <input
            className="input input-big"
            style={{ marginBottom: 24 }}
            type="number"
            placeholder="Anos"
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
            Próximo →
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 8, textAlign: "center" }}>
            Quem você quer alcançar?
          </h2>
          <p style={{ fontSize: 14, color: "#c4b5fd", textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
            Quem do outro lado você quer ouvir hoje?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 18 }}>
            {LOST_OPTIONS.map((o) => (
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
                <span style={{ fontSize: 24 }}>{o.icon}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>

          {lost && lost !== "ninguem" && (
            <>
              <label style={{ display: "block", color: "#fbf8ff", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Qual o nome dessa pessoa?
              </label>
              <input
                className="input input-big"
                style={{ marginBottom: 8 }}
                type="text"
                placeholder="Nome"
                value={who}
                onChange={(e) => setWho(e.target.value)}
                maxLength={80}
              />
              <p className="help-hint" style={{ marginBottom: 18 }}>
                Eu vou chamar essa pessoa pelo nome dela na sessão
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
              ← Voltar
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
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="card" style={{ padding: "24px 22px" }}>
          <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 8, textAlign: "center" }}>
            O que você quer perguntar?
          </h2>
          <p style={{ fontSize: 14, color: "#c4b5fd", textAlign: "center", marginBottom: 18, lineHeight: 1.5 }}>
            Conte com suas palavras o que quer saber. Pode falar com o coração.
          </p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Por exemplo: minha mãe está bem? Ela me perdoou? O que ela quer me dizer hoje? Preciso de uma orientação..."
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
              ← Voltar
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
              {loading ? "Conectando..." : "✨ Começar a sessão"}
            </button>
          </div>
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 12, color: "#9575cd", marginTop: 18, lineHeight: 1.55 }}>
        🔒 Suas informações ficam protegidas e são usadas só pela ATB
      </p>
    </div>
  );
}

function SessionComplete({ firstName }: { firstName: string }) {
  const VIDEO_URL = process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL || "#";
  return (
    <div className="card-gold" style={{ padding: "28px 22px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 12 }}>🕊️</div>
      <h2 className="serif" style={{ fontSize: "1.5rem", color: "#e8b84b", marginBottom: 10 }}>
        A sessão terminou, {firstName}
      </h2>
      <p style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.7, marginBottom: 16, maxWidth: 460, margin: "0 auto 16px" }}>
        Seu mentor falou com você. Guarde essas palavras no coração e siga as orientações com fé. Eles continuam ao seu lado.
      </p>
      <p style={{ fontSize: 14, color: "#c4b5fd", lineHeight: 1.6, marginBottom: 22, fontStyle: "italic" }}>
        ✨ Que a luz divina ilumine seus caminhos ✨
      </p>

      <div style={{ background: "linear-gradient(135deg,#3b0764,#2a0055)", border: "1.5px solid rgba(232,184,75,0.5)", borderRadius: 16, padding: "20px 18px", marginTop: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📞</div>
        <h3 className="serif" style={{ fontSize: "1.25rem", color: "#e8b84b", marginBottom: 8 }}>
          Quer falar comigo ao vivo?
        </h3>
        <p style={{ fontSize: 14, color: "#d9cdfc", lineHeight: 1.6, marginBottom: 16 }}>
          Para uma sessão completa pelo WhatsApp, olho no olho.
        </p>
        <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer" className="btn-gold" style={{ display: "inline-block", padding: "12px 24px", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
          Agendar Vídeo Chamada
        </a>
      </div>

      <Link href="/dashboard" style={{ display: "inline-block", marginTop: 18, color: "#c4b5fd", fontSize: 14, textDecoration: "underline" }}>
        Voltar para o Painel
      </Link>
    </div>
  );
}

function ConfirmingPurchase({ firstName }: { firstName: string }) {
  const router = useRouter();
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
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s infinite" }}>🕯️</div>
      <h1 className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", lineHeight: 1.2, marginBottom: 16 }}>
        Pagamento recebido!
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
        <strong style={{ color: "#f5c860" }}>{firstName}</strong>, sua sessão espírita está sendo preparada.
      </p>
      <div className="card-gold" style={{ padding: "22px 20px", marginBottom: 22 }}>
        <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.7, margin: 0 }}>
          Aguarde só um instantinho que seu <strong style={{ color: "#f5c860" }}>mentor espiritual</strong> já vai te receber.
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: "#e8b84b", animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <p style={{ fontSize: 14, color: "#9575cd", lineHeight: 1.6 }}>
        Esta página vai abrir sozinha em alguns segundos. Por favor, não feche.
      </p>
      {seconds >= 30 && (
        <div style={{ marginTop: 24, padding: "14px 18px", background: "rgba(232,184,75,0.1)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.3)" }}>
          <p style={{ fontSize: 14, color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
            Está demorando mais que o normal. Se você já pagou, espere mais um pouquinho.
          </p>
        </div>
      )}
    </div>
  );
}

function PurchaseGate({ firstName, kiwifyUrl }: { firstName: string; kiwifyUrl: string }) {
  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 620, margin: "0 auto", color: "#f5f0ff" }}>
      <BackButton />

      {/* Headline impactante */}
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}>🕯️</div>
        <div style={{ fontSize: 13, color: "#f5c860", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10, textTransform: "uppercase" }}>
          ✦ Sessão Espírita Sagrada ✦
        </div>
        <h1 className="serif" style={{ fontSize: "clamp(2rem, 5.5vw, 2.6rem)", color: "#e8b84b", lineHeight: 1.1, marginBottom: 14, fontWeight: 700 }}>
          Fale com seu<br />Espírito Mentor
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.55, maxWidth: 500, margin: "0 auto", fontWeight: 600 }}>
          O AMOR DE QUEM PARTIU<br />ainda tem algo pra te dizer
        </p>
      </div>

      {/* Subheadline emocional */}
      <p style={{ fontSize: 17, color: "#d9cdfc", lineHeight: 1.7, marginBottom: 24, textAlign: "center", padding: "0 8px", fontWeight: 500 }}>
        Sua mãe, seu pai, seu marido, alguém que você ama e perdeu...<br />
        <strong style={{ color: "#f5c860" }}>eles estão te esperando</strong>.
      </p>

      {/* O que você recebe */}
      <div className="card-gold" style={{ padding: "26px 22px", marginBottom: 22 }}>
        <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", textAlign: "center", marginBottom: 18, fontWeight: 700 }}>
          ✨ O que você vai receber
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[
            { icon: "✨", text: "Palavras de conforto de quem você ama e partiu" },
            { icon: "🕊️", text: "Saber se eles estão bem, em paz" },
            { icon: "💫", text: "Conhecer seu guia espiritual e o que ele tem pra te dizer" },
            { icon: "🌹", text: "Conselho do céu sobre uma decisão importante" },
            { icon: "🙏", text: "Curar a saudade com a verdade do outro lado" },
          ].map((b, i) => (
            <li key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", fontSize: 16, color: "#fbf8ff", lineHeight: 1.5, fontWeight: 500 }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{b.icon}</span>
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mentores espirituais */}
      <div className="card" style={{ padding: "20px 18px", marginBottom: 22, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 600 }}>
          ✦ Os mentores espirituais que podem te falar ✦
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {MENTORS.map((m) => (
            <div key={m.name} style={{
              background: "rgba(232,184,75,0.08)",
              border: "1px solid rgba(232,184,75,0.25)",
              borderRadius: 12,
              padding: "12px 8px",
            }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontSize: 12, color: "#fbf8ff", fontWeight: 700, lineHeight: 1.25, marginBottom: 4 }}>
                {m.name}
              </div>
              <div style={{ fontSize: 11, color: "#c4b5fd", lineHeight: 1.3 }}>{m.power}</div>
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
          ✦ Investimento único ✦
        </div>
        <div className="serif" style={{ fontSize: "clamp(3rem, 8vw, 4rem)", color: "#e8b84b", fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
          R$ 437
        </div>
        <div style={{ fontSize: 15, color: "#fbf8ff", marginBottom: 24, fontWeight: 500 }}>
          Você paga uma vez só
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
          🕯️ Quero falar com meu Espírito
        </a>
        <div style={{ marginTop: 18, padding: "14px 16px", background: "rgba(232,184,75,0.08)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.25)" }}>
          <p style={{ fontSize: 14, color: "#fbf8ff", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            🔒 <strong>Pagamento seguro</strong> · Cartão, Pix ou Boleto<br />
            Sua sessão fica liberada na hora
          </p>
        </div>
      </div>
    </div>
  );
}
