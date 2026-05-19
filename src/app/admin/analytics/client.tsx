"use client";
import { useState, useMemo } from "react";
import RevenueLineChart from "./charts/RevenueLineChart";
import OrdersBarChart from "./charts/OrdersBarChart";
import ProductPieChart from "./charts/ProductPieChart";
import ProviderBarChart from "./charts/ProviderBarChart";
import DeliveryPieChart from "./charts/DeliveryPieChart";

export type DayStat = { date: string; revenue: number; orders: number };
export type ProductSlice = { plan: string; count: number; totalCents: number };
export type ProviderBar = { provider: string; count: number; total: number };
export type DeliverySlice = { status: string; count: number };
export type RecentTx = {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  event: string;
  amount_cents: number | null;
  created_at: string;
};

export type KpiCards = {
  revenueToday: number;
  revenueYesterday: number;
  revenueWeek: number;
  revenueMonth: number;
  revenuePrevMonth: number;
  revenueAllTime: number;
  totalOrders: number;
  refundRate: number;
  activeSubscribers: number;
};

export type AnalyticsClientProps = {
  kpi: KpiCards;
  dailyStats: DayStat[];
  productMix: ProductSlice[];
  providerSplit: ProviderBar[];
  deliveryBreakdown: DeliverySlice[];
  recentTransactions: RecentTx[];
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  premium: "Premium",
  limpeza: "Limpeza",
  limpeza_v2: "Limpeza v2",
  pergunta1: "Pergunta 1",
  pergunta3: "Pergunta 3",
  pergunta7: "Pergunta 7",
  espirito: "Espírito",
  video_call: "Vídeo Call",
  videochamada: "Vídeo Call",
  free: "Gratuito",
};

const EVENT_LABELS: Record<string, string> = {
  "order.approved": "Aprovado",
  "order_approved": "Aprovado",
  "order.refunded": "Reembolso",
  "order_refunded": "Reembolso",
  "subscription.canceled": "Cancelado",
  "subscription_canceled": "Cancelado",
  "pergunta1_purchased": "Pergunta 1",
  "pergunta3_purchased": "Pergunta 3",
  "pergunta7_purchased": "Pergunta 7",
  "pergunta1_purchased_intl": "Pergunta 1 (Intl)",
  "pergunta3_purchased_intl": "Pergunta 3 (Intl)",
  "pergunta7_purchased_intl": "Pergunta 7 (Intl)",
  "limpeza_purchased": "Limpeza",
  "limpeza_v2_purchased": "Limpeza Espiritual",
  "limpeza_v2_purchased_intl": "Limpeza (Intl)",
  "espirito_purchased": "Espírito Mentor",
  "videochamada_purchased_intl": "Vídeo Call (Intl)",
  "video_call_purchased": "Vídeo Call",
  "basic_purchased_intl": "Plano Basic (Intl)",
  "premium_purchased_intl": "Plano Premium (Intl)",
};

const EVENT_TYPE: Record<string, "success" | "refund" | "cancel" | "sale"> = {
  "order.approved": "success",
  "order_approved": "success",
  "order.refunded": "refund",
  "order_refunded": "refund",
  "subscription.canceled": "cancel",
  "subscription_canceled": "cancel",
};

function getEventType(event: string): "success" | "refund" | "cancel" | "sale" {
  return EVENT_TYPE[event] ?? "sale";
}

function fmtBRL(brl: number): string {
  return brl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtBRLCents(cents: number | null): string {
  if (!cents) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function trendLabel(current: number, previous: number): { text: string; up: boolean } | null {
  if (previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`, up: pct >= 0 };
}

export default function AnalyticsClient({
  kpi,
  dailyStats,
  productMix,
  providerSplit,
  deliveryBreakdown,
  recentTransactions,
}: AnalyticsClientProps) {
  const [search, setSearch] = useState("");

  const filteredTx = useMemo(() => {
    if (!search.trim()) return recentTransactions;
    const q = search.toLowerCase();
    return recentTransactions.filter(
      (t) =>
        t.email.toLowerCase().includes(q) ||
        (t.name ?? "").toLowerCase().includes(q) ||
        (PLAN_LABELS[t.plan] ?? t.plan).toLowerCase().includes(q)
    );
  }, [recentTransactions, search]);

  const todayTrend = trendLabel(kpi.revenueToday, kpi.revenueYesterday);
  const monthTrend = trendLabel(kpi.revenueMonth, kpi.revenuePrevMonth);

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(232,184,75,0.12)",
    borderRadius: 16,
    padding: "20px 22px",
  };

  const chartCard: React.CSSProperties = {
    ...card,
    padding: "20px 16px 12px",
  };

  const sectionHead: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "#e8b84b",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 16,
    marginTop: 0,
    opacity: 0.85,
  };

  const chartTitle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#9575cd",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    marginBottom: 14,
    marginTop: 0,
  };

  const th: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 10,
    color: "#9575cd",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    whiteSpace: "nowrap",
    fontWeight: 700,
  };

  const td: React.CSSProperties = {
    padding: "10px 14px",
    fontSize: 13,
    color: "#ddd4f5",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  const kpis: { label: string; value: string; color: string; trend?: ReturnType<typeof trendLabel> }[] = [
    { label: "Receita Hoje", value: fmtBRL(kpi.revenueToday), color: "#4ade80", trend: todayTrend },
    { label: "Receita Semana", value: fmtBRL(kpi.revenueWeek), color: "#60a5fa" },
    { label: "Receita Mês", value: fmtBRL(kpi.revenueMonth), color: "#a78bfa", trend: monthTrend },
    { label: "Receita Total", value: fmtBRL(kpi.revenueAllTime), color: "#e8b84b" },
    { label: "Total Pedidos", value: kpi.totalOrders.toLocaleString("pt-BR"), color: "#c4b5fd" },
    {
      label: "Taxa Reembolso",
      value: `${kpi.refundRate.toFixed(1)}%`,
      color: kpi.refundRate > 10 ? "#f87171" : "#4ade80",
    },
    { label: "Assinantes Ativos", value: kpi.activeSubscribers.toLocaleString("pt-BR"), color: "#9575cd" },
  ];

  const eventBadge = (event: string) => {
    const type = getEventType(event);
    const label = EVENT_LABELS[event] ?? event;
    const colors: Record<string, { bg: string; color: string }> = {
      success: { bg: "rgba(74,222,128,0.12)", color: "#4ade80" },
      sale:    { bg: "rgba(232,184,75,0.12)",  color: "#e8b84b" },
      refund:  { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
      cancel:  { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" },
    };
    const c = colors[type];
    return (
      <span style={{
        background: c.bg,
        color: c.color,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
      }}>
        {label}
      </span>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f001e", padding: "28px 24px", maxWidth: 1400, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <a href="/admin" style={{ color: "#7c6899", fontSize: 12, textDecoration: "none", letterSpacing: "0.04em" }}>
          ← Painel Admin
        </a>
        <h1 style={{ fontSize: "2rem", color: "#f5f0ff", margin: "10px 0 4px", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Analytics <span style={{ color: "#e8b84b" }}>·</span> ATB Tarot
        </h1>
        <p style={{ color: "#7c6899", fontSize: 13, margin: 0 }}>Métricas em tempo real</p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 36 }}>
        {kpis.map((k) => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: 10, color: "#7c6899", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 700 }}>
              {k.label}
            </div>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: k.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {k.value}
            </div>
            {k.trend && (
              <div style={{ marginTop: 6, fontSize: 11, color: k.trend.up ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                {k.trend.up ? "↑" : "↓"} {k.trend.text} vs anterior
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Receita & Pedidos */}
      <p style={sectionHead}>Receita &amp; Pedidos — Últimos 30 dias</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14, marginBottom: 36 }}>
        <div style={chartCard}>
          <p style={chartTitle}>Receita diária (R$)</p>
          <RevenueLineChart data={dailyStats} />
        </div>
        <div style={chartCard}>
          <p style={chartTitle}>Pedidos por dia</p>
          <OrdersBarChart data={dailyStats} />
        </div>
      </div>

      {/* Distribuição */}
      <p style={sectionHead}>Distribuição</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 36 }}>
        <div style={chartCard}>
          <p style={chartTitle}>Mix de produtos</p>
          <ProductPieChart data={productMix} />
        </div>
        <div style={chartCard}>
          <p style={chartTitle}>Kiwify vs Stripe</p>
          <ProviderBarChart data={providerSplit} />
        </div>
        <div style={chartCard}>
          <p style={chartTitle}>Entregas — Limpeza</p>
          <DeliveryPieChart data={deliveryBreakdown} />
        </div>
      </div>

      {/* Transações recentes */}
      <p style={sectionHead}>Transações Recentes</p>
      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email, nome ou produto..."
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "10px 16px",
            color: "#f5f0ff",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Data", "Nome", "Email", "Produto", "Evento", "Valor"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTx.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#7c6899", padding: "32px" }}>
                  Nenhuma transação encontrada
                </td>
              </tr>
            ) : (
              filteredTx.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ ...td, color: "#9575cd", fontSize: 12 }}>{fmtDate(tx.created_at)}</td>
                  <td style={td}>{tx.name || <span style={{ color: "#555" }}>—</span>}</td>
                  <td style={{ ...td, fontSize: 12, color: "#9575cd", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tx.email}
                  </td>
                  <td style={td}>
                    <span style={{ color: "#c4b5fd", fontWeight: 600 }}>
                      {PLAN_LABELS[tx.plan] ?? tx.plan}
                    </span>
                  </td>
                  <td style={td}>{eventBadge(tx.event)}</td>
                  <td style={{ ...td, color: "#e8b84b", fontWeight: 700 }}>
                    {fmtBRLCents(tx.amount_cents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
