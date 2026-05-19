"use client";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Props = { data: { date: string; orders: number }[] };

export default function OrdersBarChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div style={{ height: 240 }} />;

  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
          allowDecimals={false}
          width={30}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1a0035",
            border: "1px solid rgba(149,117,205,0.3)",
            borderRadius: 10,
            fontSize: 13,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
          labelStyle={{ color: "#c4b5fd", marginBottom: 4 }}
          formatter={(v) => [v as number, "Pedidos"]}
          labelFormatter={(label) => `📅 ${label}`}
        />
        <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.orders === maxOrders ? "#e8b84b" : "rgba(149,117,205,0.7)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
