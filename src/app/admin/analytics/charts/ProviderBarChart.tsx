"use client";
import { useState, useEffect } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Props = { data: { provider: string; count: number; total: number }[] };

export default function ProviderBarChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || data.length === 0) {
    return (
      <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#7c6899", fontSize: 13 }}>
        {!mounted ? "" : "Sem dados"}
      </div>
    );
  }

  const PROVIDER_LABELS: Record<string, string> = {
    kiwify: "Kiwify",
    stripe_br: "Stripe BR",
    stripe_intl: "Stripe Intl",
  };

  const chartData = data.map((d) => ({
    name: PROVIDER_LABELS[d.provider] ?? d.provider,
    Pedidos: d.count,
    "Receita (R$)": Number(d.total.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 44, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="name" tick={{ fill: "#7c6899", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fill: "#4ade80", fontSize: 10 }} allowDecimals={false} width={30} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: "#60a5fa", fontSize: 10 }}
          tickFormatter={(v: number) => v >= 1000 ? `R$${(v/1000).toFixed(0)}k` : `R$${v.toFixed(0)}`}
          width={52} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#1a0035", border: "1px solid rgba(149,117,205,0.3)", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
          labelStyle={{ color: "#c4b5fd", marginBottom: 4 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#c4b5fd" }} />
        <Bar yAxisId="left" dataKey="Pedidos" fill="#4ade80" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="Receita (R$)" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 5, fill: "#60a5fa" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
