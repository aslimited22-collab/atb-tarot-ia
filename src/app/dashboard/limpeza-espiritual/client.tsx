"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Msg = { id?: string; role: string; content: string };

const CARDS = [
  {
    id: "limpeza",
    title: "Limpeza Profunda",
    icon: "🕯️",
    saint: "Nossa Senhora Aparecida",
    description: "Retire toda energia pesada, mau-olhado, inveja e dor da alma com o manto sagrado de Nossa Senhora.",
    prompt: "Minha querida ATB, eu sinto que tem energia pesada na minha vida, parece que carrego um peso. Preciso de uma limpeza profunda. Me ajude a entender o que está pesando e como posso me limpar com a força de Nossa Senhora Aparecida.",
    color: "linear-gradient(135deg, #e8b84b 0%, #f5c860 50%, #c89a2a 100%)",
  },
  {
    id: "caminhos",
    title: "Abrir Caminhos",
    icon: "🗝️",
    saint: "Santo Antônio + Exu do Ouro",
    description: "Desate os nós espirituais, separe o que está atrapalhando e abra as portas da prosperidade.",
    prompt: "Minha querida ATB, sinto que meus caminhos estão fechados, nada flui na minha vida, parece tudo travado. Preciso abrir meus caminhos. Me ajude com a força de Santo Antônio para desatar os nós e Exu do Ouro para abrir minha prosperidade.",
    color: "linear-gradient(135deg, #6a4a8a 0%, #8a5fb0 50%, #4a2f6a 100%)",
  },
  {
    id: "protecao",
    title: "Proteção Sagrada",
    icon: "⚔️",
    saint: "São Miguel Arcanjo + São Jorge",
    description: "Corte feitiços, demandas e inveja com a espada de São Miguel e o escudo de São Jorge guerreiro.",
    prompt: "Minha querida ATB, sinto que tem gente fazendo coisa ruim contra mim, sinto inveja, olho gordo, talvez até feitiço. Preciso de proteção sagrada. Me ajude a invocar São Miguel Arcanjo e São Jorge para me proteger e cortar tudo de ruim.",
    color: "linear-gradient(135deg, #d4344a 0%, #e85a72 50%, #8a1f30 100%)",
  },
];

const SAINTS = [
  { name: "Nossa Senhora Aparecida", icon: "👑", power: "Manto sagrado e cura" },
  { name: "Sagrado Coração de Jesus", icon: "❤️‍🔥", power: "Queima energias ruins" },
  { name: "São Miguel Arcanjo", icon: "⚔️", power: "Espada que corta feitiços" },
  { name: "Santo Antônio", icon: "🙏", power: "Desata os nós" },
  { name: "São Jorge Guerreiro", icon: "🛡️", power: "Proteção contra inimigos" },
  { name: "N. S. Desatadora dos Nós", icon: "🪢", power: "Liberta a vida presa" },
];

export default function LimpezaClient({
  purchased,
  justPurchased,
  firstName,
  kiwifyUrl,
  initialMessages,
  initialRemaining,
}: {
  purchased: boolean;
  justPurchased?: boolean;
  firstName: string;
  kiwifyUrl: string;
  initialMessages: Msg[];
  initialRemaining: number;
}) {
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

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || remaining <= 0) return;

    setLoading(true);
    setStreaming("");
    const optimistic: Msg = { role: "user", content: trimmed };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setActiveCard(null);

    try {
      const res = await fetch("/api/limpeza", {
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
    } catch (e) {
      toast.error("Erro de conexão. Tente novamente.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function pickCard(cardId: string) {
    if (loading || remaining <= 0) return;
    const card = CARDS.find((c) => c.id === cardId);
    if (!card) return;
    setActiveCard(cardId);
    setInput(card.prompt);
  }

  return (
    <div style={{ padding: "24px 16px 80px", maxWidth: 760, margin: "0 auto", color: "#f5f0ff" }}>

      {/* Header sagrado */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🕊️</div>
        <h1 className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", lineHeight: 1.15, marginBottom: 6 }}>
          Limpeza Espiritual
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#c4b5fd", lineHeight: 1.55, maxWidth: 480, margin: "0 auto" }}>
          Olá, <strong style={{ color: "#f5c860" }}>{firstName}</strong>. Esta é uma sessão sagrada com ATB.
        </p>
      </div>

      {/* Contador de mensagens */}
      <div className="card-gold" style={{ padding: "14px 18px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Mensagens sagradas restantes
        </div>
        <div className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", fontWeight: 700, lineHeight: 1 }}>
          {remaining} <span style={{ fontSize: "1rem", color: "#9575cd" }}>de 3</span>
        </div>
      </div>

      {/* Painel de Santos */}
      <div className="card" style={{ padding: "16px 14px", marginBottom: 20 }}>
        <div className="serif" style={{ fontSize: "1.05rem", color: "#e8b84b", textAlign: "center", marginBottom: 12 }}>
          ✨ Forças que estão com você
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {SAINTS.map((s) => (
            <div key={s.name} style={{
              background: "rgba(232,184,75,0.08)",
              border: "1px solid rgba(232,184,75,0.25)",
              borderRadius: 12,
              padding: "10px 8px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: "#fbf8ff", fontWeight: 600, lineHeight: 1.25, marginBottom: 2 }}>
                {s.name}
              </div>
              <div style={{ fontSize: 10, color: "#9575cd", lineHeight: 1.3 }}>{s.power}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cartas de Tarot */}
      {messages.length === 0 && (
        <>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <h2 className="serif" style={{ fontSize: "1.35rem", color: "#e8b84b", marginBottom: 6 }}>
              Escolha uma carta para começar
            </h2>
            <p style={{ fontSize: 14, color: "#c4b5fd" }}>
              Toque na carta que mais chama seu coração agora
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 24 }}>
            {CARDS.map((card) => (
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
                  <div style={{ fontSize: 42 }}>{card.icon}</div>
                  <div>
                    <div className="serif" style={{ fontSize: "1.4rem", fontWeight: 700, lineHeight: 1.1 }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2, fontStyle: "italic" }}>
                      ✦ {card.saint}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, opacity: 0.92 }}>
                  {card.description}
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
            <div style={{ color: "#9575cd", fontSize: 14, fontStyle: "italic", padding: "8px 12px" }}>
              ATB está consultando os santos...
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
            placeholder="Conte sua dor para ATB..."
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
            {loading ? "..." : "✨ Enviar"}
          </button>
        </div>
      ) : (
        <div className="card-gold" style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🙏</div>
          <p style={{ fontSize: 15, color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
            Sua sessão sagrada de limpeza foi concluída. Agora siga as orientações que ATB lhe deu, com fé e devoção. Que os santos te abençoem.
          </p>
        </div>
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
            ✨ ATB
          </div>
        )}
        {content}
      </div>
    </div>
  );
}

function ConfirmingPurchase({ firstName }: { firstName: string }) {
  const router = useRouter();
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
      <div style={{ fontSize: 80, marginBottom: 18, animation: "pulse 2s ease-in-out infinite" }}>🕊️</div>

      <h1 className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", lineHeight: 1.2, marginBottom: 16 }}>
        Pagamento recebido!
      </h1>

      <p style={{ fontSize: "1.2rem", color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24, maxWidth: 460, margin: "0 auto 24px" }}>
        <strong style={{ color: "#f5c860" }}>{firstName}</strong>, sua compra está sendo confirmada agora.
      </p>

      <div className="card-gold" style={{ padding: "22px 20px", marginBottom: 22 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
        <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.7, margin: 0 }}>
          Estamos preparando sua <strong style={{ color: "#f5c860" }}>Limpeza Espiritual</strong>.
          <br />
          Aguarde só um instantinho que ATB já vai te receber.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 18 }}>
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
        Esta página vai abrir sozinha em alguns segundos.
        <br />
        Por favor, não feche.
      </p>

      {seconds >= 30 && (
        <div style={{ marginTop: 24, padding: "14px 18px", background: "rgba(232,184,75,0.1)", borderRadius: 12, border: "1px solid rgba(232,184,75,0.3)" }}>
          <p style={{ fontSize: 14, color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
            Está demorando mais que o normal. Se você já pagou, espere mais alguns instantes.
            <br />
            Se precisar de ajuda, entre em contato com nosso suporte.
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
  return (
    <div style={{ padding: "32px 20px 80px", maxWidth: 620, margin: "0 auto", color: "#f5f0ff" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 72, marginBottom: 12 }}>🕊️</div>
        <h1 className="serif" style={{ fontSize: "2.4rem", color: "#e8b84b", lineHeight: 1.15, marginBottom: 10 }}>
          Limpeza Espiritual com ATB
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#c4b5fd", lineHeight: 1.65, maxWidth: 480, margin: "0 auto" }}>
          {firstName}, esta é uma sessão sagrada e exclusiva. ATB vai te limpar de toda energia pesada, abrir seus caminhos e te proteger com a força dos santos.
        </p>
      </div>

      {/* Mockup das 3 cartas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24, filter: "blur(2px) brightness(0.7)" }}>
        {CARDS.map((c) => (
          <div key={c.id} style={{
            background: c.color,
            borderRadius: 14,
            padding: "20px 8px",
            textAlign: "center",
            aspectRatio: "2 / 3",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            color: "#1e0040",
          }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>{c.icon}</div>
            <div className="serif" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{c.title}</div>
          </div>
        ))}
      </div>

      {/* Pacote de benefícios */}
      <div className="card" style={{ padding: "20px 22px", marginBottom: 20 }}>
        <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", textAlign: "center", marginBottom: 14 }}>
          O que você recebe
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[
            { icon: "🕯️", text: "3 mensagens sagradas com ATB focadas só na sua limpeza" },
            { icon: "🗝️", text: "Identificação do que está pesando e bloqueando sua vida" },
            { icon: "👑", text: "Invocação dos santos certos para o seu caso" },
            { icon: "💧", text: "Banhos, defumações e orações personalizadas" },
            { icon: "⚔️", text: "Proteção contra inveja, mau-olhado e feitiço" },
            { icon: "✨", text: "Abertura de caminhos para prosperidade e amor" },
          ].map((b, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", fontSize: 15, color: "#d9cdfc", lineHeight: 1.55 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{b.icon}</span>
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Santos */}
      <div className="card-gold" style={{ padding: "18px 16px", marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Forças Sagradas que estarão com você
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
          {SAINTS.map((s) => (
            <div key={s.name} style={{ textAlign: "center", width: 80 }}>
              <div style={{ fontSize: 30, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 10, color: "#fbf8ff", lineHeight: 1.3 }}>{s.name}</div>
            </div>
          ))}
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
          Investimento único
        </div>
        <div className="serif" style={{ fontSize: "3rem", color: "#e8b84b", fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
          R$ 100
        </div>
        <div style={{ fontSize: 13, color: "#9575cd", marginBottom: 18 }}>
          Pagamento único • Acesso imediato após confirmação
        </div>
        <a
          href={kiwifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold"
          style={{ display: "inline-block", padding: "16px 32px", fontSize: "1.05rem", fontWeight: 700 }}
        >
          ✨ Quero minha Limpeza Espiritual
        </a>
        <p style={{ fontSize: 12, color: "#9575cd", marginTop: 14, lineHeight: 1.5 }}>
          Pagamento seguro processado pela Kiwify.<br />
          Após a compra, sua limpeza estará liberada automaticamente.
        </p>
      </div>
    </div>
  );
}
