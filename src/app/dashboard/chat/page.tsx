"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChatBubble } from "@/components/ChatBubble";
import { Skeleton } from "@/components/Skeleton";

type Msg = { id?: string; role: "user" | "assistant"; content: string; typing?: boolean };
const CHAR_DELAY = 38;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function UpgradeCard({ basicUrl, premiumUrl }: { basicUrl: string; premiumUrl: string }) {
  return (
    <div className="card" style={{ margin:"16px auto", maxWidth:380, padding:28, textAlign:"center" }}>
      <div style={{ fontSize:44, marginBottom:8 }}>🔮</div>
      <p className="serif" style={{ fontSize:"1.35rem", color:"#e8b84b", marginBottom:8 }}>Sua leitura continua aqui</p>
      <p style={{ fontSize:15, color:"#c4b5fd", marginBottom:24, lineHeight:1.6 }}>
        Escolha seu plano e ouça tudo o que as cartas têm a dizer pra você
      </p>
      <a href={premiumUrl} target="_blank" rel="noopener noreferrer"
        style={{ display:"block", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", fontWeight:700, fontSize:17, padding:"16px", borderRadius:14, marginBottom:12, textDecoration:"none" }}>
        Quero a leitura completa — R$59/mês
      </a>
      <a href={basicUrl} target="_blank" rel="noopener noreferrer"
        style={{ display:"block", border:"2px solid #e8b84b", color:"#e8b84b", fontWeight:600, fontSize:16, padding:"13px", borderRadius:14, textDecoration:"none" }}>
        Plano básico — R$29/mês
      </a>
      <p style={{ fontSize:13, color:"#9575cd", marginTop:12 }}>Pagamento seguro via Pix ou cartão</p>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [remaining, setRemaining] = useState<number>(-1);
  const [name, setName]         = useState("Alma");
  const [plan, setPlan]         = useState("free");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const BASIC_URL   = process.env.NEXT_PUBLIC_KIWIFY_BASIC_URL   || "#";
  const PREMIUM_URL = process.env.NEXT_PUBLIC_KIWIFY_PREMIUM_URL || "#";
  const VIDEO_URL   = process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL   || "#";

  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => {
      setMessages(d.messages || []);
      setRemaining(d.remaining ?? -1);
      if (d.name) setName(d.name);
      if (d.plan) setPlan(d.plan);
      if (d.plan === "free" && (d.remaining === 0 || (d.messages?.length ?? 0) > 0)) setShowUpgrade(true);
    }).catch(() => toast.error("Erro ao carregar histórico")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior:"smooth" });
  }, [messages, showUpgrade]);

  async function typeOut(text: string, onChar: (s: string) => void) {
    let out = "";
    for (let i = 0; i < text.length; i++) {
      out += text[i];
      onChar(out);
      const ch = text[i];
      const pause = (ch==="."||ch===","||ch==="?"||ch==="!") ? CHAR_DELAY*6
        : (ch===" " && Math.random()<0.08) ? CHAR_DELAY*4
        : CHAR_DELAY + Math.floor(Math.random()*20);
      await sleep(pause);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput(""); setSending(true); setShowUpgrade(false);

    setMessages((m) => [...m, { role:"user", content:text }, { role:"assistant", content:"", typing:true }]);
    await sleep(7000);
    setMessages((m) => {
      const c = [...m];
      c[c.length-1] = { role:"assistant", content:`Olá, Querida Alma, ${name}` };
      return [...c, { role:"assistant", content:"", typing:true }];
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ message:text }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error:"Erro" }));
        toast.error(err.error || "Erro ao enviar");
        setMessages((m) => m.slice(0,-3));
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        toast.error("Resposta inválida do servidor");
        setMessages((m) => m.slice(0,-3));
        return;
      }
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream:true });
      }
      setMessages((m) => { const c=[...m]; c[c.length-1]={ role:"assistant", content:"" }; return c; });
      await typeOut(full, (d) => setMessages((m) => { const c=[...m]; c[c.length-1]={ role:"assistant", content:d }; return c; }));
      setRemaining((r) => (r>0 ? r-1 : 0));
      if (plan==="free") setShowUpgrade(true);
    } catch (e: unknown) {
      const msg = e instanceof Error && e.name === "AbortError" ? "Resposta demorada demais. Tente novamente." : "Erro de rede";
      toast.error(msg);
      setMessages((m) => m.slice(0,-3));
    } finally {
      clearTimeout(timer);
      setSending(false);
    }
  }

  const canSend = plan !== "free" || remaining > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", background:"#120025" }} className="h-[calc(100vh-57px)] md:h-screen">

      <div style={{ padding: "14px 16px 12px", background: "#1a0035", borderBottom: "1px solid rgba(196,181,253,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#fbf8ff",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(232,184,75,0.12)",
              border: "1.5px solid rgba(232,184,75,0.4)",
              minHeight: 44,
            }}
          >
            <span style={{ fontSize: 18 }}>←</span>
            <span>Painel</span>
          </Link>
          <div style={{ fontSize: 16, color: "#fbf8ff", fontWeight: 600, background: "rgba(232,184,75,0.12)", padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(232,184,75,0.3)" }}>
            {remaining < 0 ? "∞" : remaining} {remaining === 1 ? "restante" : "restantes"}
          </div>
        </div>
        <h1 className="serif" style={{ fontSize: "1.7rem", color: "#f5f0ff", fontWeight: 700, margin: 0 }}>💬 Chat com ATB</h1>
      </div>

      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"16px" }}>
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-12 w-1/2 ml-auto" /><Skeleton className="h-12 w-2/3" /></div>
        ) : messages.length === 0 && !showUpgrade ? (
          <div style={{ textAlign: "center", color: "#fbf8ff", marginTop: 60, padding: "0 20px" }}>
            <div style={{ fontSize: 80, marginBottom: 18 }}>🔮</div>
            <h2 className="serif" style={{ fontSize: "1.6rem", color: "#e8b84b", marginBottom: 12, fontWeight: 700 }}>
              Olá, querida alma 💛
            </h2>
            <p style={{ fontSize: 18, color: "#fbf8ff", lineHeight: 1.6, maxWidth: 420, margin: "0 auto", fontWeight: 500 }}>
              Pode me contar tudo. Estou aqui para te ouvir e te ajudar com as cartas.
            </p>
            <p style={{ fontSize: 15, color: "#c4b5fd", lineHeight: 1.6, marginTop: 18, fontStyle: "italic" }}>
              Escreva sua pergunta no campo abaixo e aperte <strong style={{ color: "#e8b84b" }}>Enviar</strong>
            </p>
          </div>
        ) : (
          <>
            {messages.map((m,i) => (
              <div key={i}>
                <ChatBubble role={m.role} content={m.content} typing={m.typing} />
                {m.role === "assistant" && !m.typing && m.content && i === messages.length - 1 && plan !== "free" && (
                  <div style={{ margin:"12px 0 4px 0", display:"flex", justifyContent:"flex-start" }}>
                    <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer"
                      style={{ display:"inline-flex", alignItems:"center", gap:10, background:"linear-gradient(135deg,#3b0764,#2a0055)", border:"1.5px solid rgba(232,184,75,0.45)", borderRadius:16, padding:"12px 18px", textDecoration:"none", maxWidth:360 }}>
                      <span style={{ fontSize:22 }}>📞</span>
                      <div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#e8b84b", lineHeight:1.3 }}>Quer conversar ao vivo comigo?</div>
                        <div style={{ fontSize:13, color:"#c4b5fd", marginTop:2 }}>Vídeo Chamada — R$497</div>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            ))}
            {showUpgrade && !sending && <UpgradeCard basicUrl={BASIC_URL} premiumUrl={PREMIUM_URL} />}
          </>
        )}
      </div>

      <div style={{ padding: "16px", background: "#1a0035", borderTop: "1px solid rgba(196,181,253,0.15)" }}>
        {canSend ? (
          <form onSubmit={send} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <input
              className="input"
              style={{ flex: 1, fontSize: 17, padding: "16px 18px", minHeight: 60, borderWidth: 2 }}
              placeholder="Escreva sua pergunta para ATB..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              aria-label="Sua mensagem"
            />
            <button
              className="btn-gold"
              disabled={sending || !input.trim()}
              style={{
                padding: "16px 24px",
                fontSize: 17,
                flexShrink: 0,
                minHeight: 60,
                opacity: sending || !input.trim() ? 0.55 : 1,
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {sending ? "..." : "✨ Enviar"}
            </button>
          </form>
        ) : (
          <a
            href={PREMIUM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              textAlign: "center",
              background: "linear-gradient(135deg,#e8b84b,#c9950a)",
              color: "#120025",
              fontWeight: 800,
              fontSize: 20,
              padding: "20px",
              borderRadius: 16,
              textDecoration: "none",
              minHeight: 70,
              boxShadow: "0 8px 22px rgba(232,184,75,0.4)",
            }}
          >
            ✨ Continuar minha leitura
          </a>
        )}
      </div>
    </div>
  );
}
