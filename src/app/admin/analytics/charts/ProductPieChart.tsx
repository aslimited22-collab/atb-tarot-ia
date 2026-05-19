"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  premium: "Premium",
  limpeza: "Limpeza",
  limpeza_v2: "Limpeza Espiritual",
  limpeza_v2_intl: "Limpeza (Intl)",
  pergunta1: "Pergunta 1",
  pergunta3: "Pergunta 3",
  pergunta7: "Pergunta 7",
  espirito: "Espírito Mentor",
  video_call: "Vídeo Call",
  videochamada: "Vídeo Call",
  free: "Gratuito",
  unknown: "Outro",
};

const COLORS = ["#e8b84b","#9575cd","#4ade80","#60a5fa","#f87171","#fb923c","#a78bfa","#34d399","#f472b6"];

type Props = { data: { plan: string; count: number; totalCents: number }[] };

export default function ProductPieChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || data.length === 0) {
    return (
      <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#7c6899", fontSize: 13 }}>
        {!mounted ? "" : "Sem dados"}
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d) => ({
    name: PLAN_LABELS[d.plan] ?? d.plan,
    value: d.count,
    totalBRL: d.totalCents / 100,
    pct: ((d.count / total) * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={chartData} cx="40%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#1a0035", border: "1px solid rgba(149,117,205,0.3)", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
          formatter={(value, name, props) => {
            const v = value as number;
            const p = (props.payload as { pct: string; totalBRL: number });
            return [`${v} venda${v !== 1 ? "s" : ""} · ${p.pct}% · R$ ${p.totalBRL.toFixed(2)}`, name as string];
          }}
        />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: 11, color: "#c4b5fd", paddingLeft: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
