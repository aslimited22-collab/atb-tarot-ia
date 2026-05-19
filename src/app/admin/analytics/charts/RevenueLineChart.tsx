"use client";
import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = { data: { date: string; revenue: number }[] };

export default function RevenueLineChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div style={{ height: 240 }} />;

  const maxVal = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e8b84b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#e8b84b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#7c6899", fontSize: 10 }}
          tickFormatter={(d: string) => d.slice(5)}
          interval={Math.floor(data.length / 6)}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#7c6899", fontSize: 10 }}
          tickFormatter={(v: number) =>
            v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`
          }
          domain={[0, Math.ceil(maxVal * 1.15)]}
          width={52}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1a0035",
            border: "1px solid rgba(232,184,75,0.25)",
            borderRadius: 10,
            fontSize: 13,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
          labelStyle={{ color: "#c4b5fd", marginBottom: 4 }}
          formatter={(v) => [
            `R$ ${(v as number).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            "Receita",
          ]}
          labelFormatter={(label) => `📅 ${label}`}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#e8b84b"
          strokeWidth={2.5}
          fill="url(#revenueGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#e8b84b", stroke: "#120025", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
