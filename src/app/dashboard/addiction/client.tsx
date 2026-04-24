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
  { id: "Álcool", icon: "🍺" },
  { id: "Cigarro", icon: "🚬" },
];

type Ritual = { name: string; steps: string[] };
type RoutinePeriod = { period: string; steps: string[] };

type RichResult = {
  mode: "rich";
  card: string;
  cardMeaning: string;
  forces: string[];
  insight: string;
  rituals: Ritual[];
  routine: RoutinePeriod[];
  truth: string;
};

type SimpleResult = {
  mode: "simple";
  card: string;
  meaning: string;
  steps: string[];
};

type Result = RichResult | SimpleResult;

type Tab = "leitura" | "rituais" | "rotina";

export function AddictionClient() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [tab, setTab] = useState<Tab>("leitura");

  async function pick(category: string) {
    setSelected(category);
    setLoading(true);
    setResult(null);
    setTab("leitura");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch("/api/addiction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({ error: "Resposta inválida do servidor" }));
      if (!res.ok) {
        toast.error(data.error || `Erro ${res.status}`);
      } else if (data && (data.mode === "rich" || data.mode === "simple")) {
        setResult(data);
      } else {
        toast.error("Resposta inesperada do servidor");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error && e.name === "AbortError" ? "Tempo esgotado. Tente novamente." : "Erro de rede";
      toast.error(msg);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  const isRich = result?.mode === "rich";

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="serif text-3xl md:text-4xl gold mb-2">Guia de Vícios</h1>
      <p className="text-white/70 mb-8">Escolha um padrão que deseja compreender e romper.</p>

      {/* Grade de categorias */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => pick(c.id)}
            className="card p-4 text-center hover:bg-white/5 transition"
            style={selected === c.id ? { borderColor: "#e8b84b", borderWidth: "1px", borderStyle: "solid" } : {}}
          >
            <div className="text-3xl mb-2">{c.icon}</div>
            <div className="text-sm">{c.id}</div>
          </button>
        ))}
      </div>

      {/* Skeleton enquanto carrega */}
      {loading && (
        <div className="card p-8 space-y-4">
          <Skeleton className="h-8 w-1/3 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      )}

      {/* Resultado rico (com PDF) */}
      {result && !loading && isRich && (() => {
        const r = result as RichResult;
        return (
          <div className="card overflow-hidden">
            {/* Cabeçalho — carta + categoria */}
            <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #2a0055 0%, #1e0040 100%)" }}>
              <div className="text-xs text-white/50 uppercase tracking-widest mb-1">Arquétipo Espiritual</div>
              <div className="serif text-4xl gold mb-2">{r.card}</div>
              {r.forces.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {r.forces.map((f, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ background: "#e8b84b22", color: "#e8b84b", border: "1px solid #e8b84b44" }}>
                      ✨ {f.split(" — ")[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Abas */}
            <div className="flex border-b" style={{ borderColor: "#ffffff15" }}>
              {(["leitura", "rituais", "rotina"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-3 text-sm font-medium transition capitalize"
                  style={tab === t
                    ? { color: "#e8b84b", borderBottom: "2px solid #e8b84b" }
                    : { color: "rgba(255,255,255,0.5)" }}
                >
                  {t === "leitura" ? "🃏 Leitura" : t === "rituais" ? "🕯 Rituais" : "🌅 Rotina"}
                </button>
              ))}
            </div>

            {/* Aba: Leitura */}
            {tab === "leitura" && (
              <div className="p-6 space-y-5">
                <div>
                  <h3 className="serif text-lg gold mb-2">O que a carta revela</h3>
                  <p className="text-white/85 leading-relaxed">{r.cardMeaning}</p>
                </div>
                {r.forces.length > 0 && (
                  <div>
                    <h3 className="serif text-lg gold mb-3">Forças Espirituais Ativas</h3>
                    <ul className="space-y-2">
                      {r.forces.map((f, i) => (
                        <li key={i} className="flex gap-2 text-white/80 text-sm">
                          <span style={{ color: "#e8b84b" }}>✦</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h3 className="serif text-lg gold mb-2">O que está acontecendo com você</h3>
                  <p className="text-white/85 leading-relaxed">{r.insight}</p>
                </div>
                {/* Verdade final */}
                <div className="rounded-xl p-4 mt-2" style={{ background: "#e8b84b12", border: "1px solid #e8b84b33" }}>
                  <p className="text-sm leading-relaxed italic" style={{ color: "#e8b84b" }}>
                    &ldquo;{r.truth}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Aba: Rituais */}
            {tab === "rituais" && (
              <div className="p-6 space-y-6">
                {r.rituals.map((ritual, i) => (
                  <div key={i}>
                    <h3 className="serif text-lg gold mb-3">🕯 {ritual.name}</h3>
                    <ol className="space-y-3">
                      {ritual.steps.map((step, j) => (
                        <li key={j} className="flex gap-3">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                            style={{ background: "#e8b84b", color: "#1a0030" }}
                          >
                            {j + 1}
                          </span>
                          <span className="text-white/85 text-sm leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                    {i < r.rituals.length - 1 && (
                      <div className="mt-5 border-t" style={{ borderColor: "#ffffff10" }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Aba: Rotina */}
            {tab === "rotina" && (
              <div className="p-6 space-y-5">
                {r.routine.map((period, i) => {
                  const icons: Record<string, string> = {
                    "Manhã": "🌅",
                    "Tarde": "☀️",
                    "Noite": "🌙",
                    "Antes de Dormir": "🌑",
                  };
                  return (
                    <div key={i}>
                      <h3 className="serif text-lg gold mb-3">
                        {icons[period.period] || "✦"} {period.period}
                      </h3>
                      <ul className="space-y-2">
                        {period.steps.map((step, j) => (
                          <li key={j} className="flex gap-2 text-white/85 text-sm leading-relaxed">
                            <span style={{ color: "#e8b84b" }} className="shrink-0 mt-1">›</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                      {i < r.routine.length - 1 && (
                        <div className="mt-4 border-t" style={{ borderColor: "#ffffff10" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Resultado simples (fallback DeepSeek) */}
      {result && !loading && !isRich && (() => {
        const r = result as SimpleResult;
        return (
          <div className="card p-8">
            <div className="text-center mb-6">
              <div className="text-sm text-white/60 uppercase tracking-wider mb-2">Arquétipo associado</div>
              <div className="serif text-4xl gold">{r.card}</div>
            </div>
            <div className="mb-6">
              <h3 className="serif text-xl gold mb-2">Significado</h3>
              <p className="text-white/90 leading-relaxed">{r.meaning}</p>
            </div>
            <div>
              <h3 className="serif text-xl gold mb-3">Orientação espiritual</h3>
              <ol className="space-y-3">
                {r.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: "#e8b84b", color: "#1a0030" }}>
                      {i + 1}
                    </span>
                    <span className="text-white/90 pt-1">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
