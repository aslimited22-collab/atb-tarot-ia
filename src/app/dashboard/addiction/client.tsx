"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/Skeleton";

const CATEGORIES = [
  { id: "Alimentação Emocional", icon: "🍰" },
  { id: "Relacionamentos Tóxicos", icon: "💔" },
  { id: "Procrastinação", icon: "⏳" },
  { id: "Vício em Redes Sociais", icon: "📱" },
  { id: "Ansiedade Crônica", icon: "🌊" },
];

type Result = { card: string; meaning: string; steps: string[] };

export function AddictionClient() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function pick(category: string) {
    setSelected(category);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/addiction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Erro");
      else setResult(data);
    } catch {
      toast.error("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="serif text-3xl md:text-4xl gold mb-2">Guia de Vícios</h1>
      <p className="text-white/70 mb-8">Escolha um padrão que deseja compreender e romper.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            className={`card p-4 text-center hover:bg-white/5 transition ${selected === c.id ? "border-gold" : ""}`}
            style={selected === c.id ? { borderColor: "#d4af37" } : {}}
          >
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="text-sm">{c.id}</div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="card p-8 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-20" />
          <Skeleton className="h-32" />
        </div>
      )}

      {result && !loading && (
        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="text-sm text-white/60 uppercase tracking-wider mb-2">Arquétipo associado</div>
            <div className="serif text-4xl gold">{result.card}</div>
          </div>
          <div className="mb-6">
            <h3 className="serif text-xl gold mb-2">Significado</h3>
            <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{result.meaning}</p>
          </div>
          <div>
            <h3 className="serif text-xl gold mb-3">Plano de 3 passos espirituais</h3>
            <ol className="space-y-3">
              {result.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-gold text-[#1a0030] flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</span>
                  <span className="text-white/90 pt-1">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
