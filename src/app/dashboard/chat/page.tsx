"use client";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChatBubble } from "@/components/ChatBubble";
import { Skeleton } from "@/components/Skeleton";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        setRemaining(d.remaining ?? -1);
      })
      .catch(() => toast.error("Erro ao carregar histórico"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        toast.error(err.error || "Erro ao enviar");
        setMessages((m) => m.slice(0, -2));
        setSending(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }

      setRemaining((r) => (r > 0 ? r - 1 : r));
    } catch {
      toast.error("Erro de rede");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <h1 className="serif text-2xl gold">Chat com ATB</h1>
        <div className="text-sm text-white/70">
          Mensagens restantes: <span className="gold font-semibold">{remaining < 0 ? "∞" : remaining}</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-white/50 mt-20">
            <div className="text-5xl mb-3">🔮</div>
            <p>Faça a primeira pergunta à ATB.</p>
          </div>
        ) : (
          messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)
        )}
      </div>

      <form onSubmit={send} className="p-4 border-t border-white/10 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Escreva sua pergunta..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button className="btn-gold" disabled={sending || !input.trim()}>
          {sending ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
