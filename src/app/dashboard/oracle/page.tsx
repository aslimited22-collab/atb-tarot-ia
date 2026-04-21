"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/Skeleton";

type Reading = { card: string; interpretation: string; message: string };

export default function OraclePage() {
  const [data, setData] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/oracle")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error);
        else setData(d);
      })
      .catch(() => toast.error("Erro ao carregar oráculo"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="serif text-3xl md:text-4xl gold mb-2">Oráculo Diário</h1>
      <p className="text-white/70 mb-8">Sua carta do dia, escolhida pela ATB.</p>

      {loading ? (
        <div className="card p-8 space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-24" />
          <Skeleton className="h-16" />
        </div>
      ) : data ? (
        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="text-sm text-white/60 uppercase tracking-wider mb-2">Sua carta de hoje</div>
            <div className="serif text-4xl md:text-5xl gold">{data.card}</div>
          </div>
          <div className="mb-6">
            <h3 className="serif text-xl gold mb-2">Interpretação</h3>
            <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{data.interpretation}</p>
          </div>
          {data.message && (
            <div className="border-t border-white/10 pt-6">
              <h3 className="serif text-xl gold mb-2">Mensagem do dia</h3>
              <p className="italic text-white/80">{data.message}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-white/60">Não foi possível carregar a leitura.</div>
      )}
    </div>
  );
}
