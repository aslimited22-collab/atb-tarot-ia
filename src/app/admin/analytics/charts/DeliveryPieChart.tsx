"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const DELIVERY_LABELS: Record<string, string> = {
  both_sent: "Email + WhatsApp",
  email_sent: "Só Email",
  whatsapp_sent: "Só WhatsApp",
  pending: "Pendente",
  failed: "Falhou",
  manual_review: "Rev. Manual",
};

const DELIVERY_COLORS: Record<string, string> = {
  both_sent: "#4ade80", email_sent: "#60a5fa", whatsapp_sent: "#a78bfa",
  pending: "#e8b84b", failed: "#f87171", manual_review: "#fb923c",
};

type Props = { data: { status: string; count: number }[] };

export default function DeliveryPieChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || data.length === 0) {
    return (
      <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "#7c6899", fontSize: 13 }}>
        {!mounted ? "" : "Sem pedidos Limpeza"}
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d) => ({
    name: DELIVERY_LABELS[d.status] ?? d.status,
    value: d.count,
    color: DELIVERY_COLORS[d.status] ?? "#888",
    pct: ((d.count / total) * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={chartData} cx="40%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value">
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#1a0035", border: "1px solid rgba(149,117,205,0.3)", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
          formatter={(value, name, props) => {
            const v = value as number;
            const p = props.payload as { pct: string };
            return [`${v} pedido${v !== 1 ? "s" : ""} · ${p.pct}%`, name as string];
          }}
        />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: 11, color: "#c4b5fd", paddingLeft: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
