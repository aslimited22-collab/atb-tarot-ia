"use client";
import { useState, useMemo } from "react";

type Customer = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  kiwify_order_id: string | null;
  created_at: string;
};

type Purchase = {
  id: string;
  email: string;
  name: string | null;
  kiwify_order_id: string;
  plan: string;
  event: string;
  amount_cents: number | null;
  created_at: string;
};

type Metrics = {
  totalActive: number;
  newToday: number;
  refundsMonth: number;
  revenueCents: number;
};

const planColor: Record<string, string> = {
  premium: "#e8b84b",
  basic: "#9575cd",
  free: "#666",
};

const eventLabel: Record<string, string> = {
  "order.approved": "✅ Aprovado",
  "order_approved": "✅ Aprovado",
  "order.refunded": "↩️ Reembolso",
  "order_refunded": "↩️ Reembolso",
  "subscription.canceled": "❌ Cancelado",
  "subscription_canceled": "❌ Cancelado",
};

function fmtBRL(cents: number | null) {
  if (!cents) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminClient({ customers, purchases, metrics }: {
  customers: Customer[];
  purchases: Purchase[];
  metrics: Metrics;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"customers" | "purchases">("customers");

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      c => c.email.includes(q) || (c.kiwify_order_id ?? "").includes(q) || (c.name ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const filteredPurchases = useMemo(() => {
    if (!search.trim()) return purchases;
    const q = search.toLowerCase();
    return purchases.filter(
      p => p.email.includes(q) || p.kiwify_order_id.includes(q) || (p.name ?? "").toLowerCase().includes(q)
    );
  }, [purchases, search]);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: "20px 24px",
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 11,
    color: "#9575cd",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: 13,
    color: "#e2d9f3",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#120025", padding: "24px 20px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.8rem", color: "#f5f0ff", marginBottom: 4, fontFamily: "Georgia, serif" }}>
        Painel Admin
      </h1>
      <p style={{ color: "#9575cd", fontSize: 14, marginBottom: 28 }}>Visão geral dos seus clientes</p>

      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Assinantes ativos", value: metrics.totalActive, color: "#e8b84b" },
          { label: "Novos hoje", value: metrics.newToday, color: "#4ade80" },
          { label: "Reembolsos este mês", value: metrics.refundsMonth, color: "#f87171" },
          { label: "Receita este mês", value: fmtBRL(metrics.revenueCents), color: "#e8b84b" },
        ].map(m => (
          <div key={m.label} style={cardStyle}>
            <div style={{ fontSize: 11, color: "#9575cd", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{m.label}</div>
            <div style={{ fontSize: "1.9rem", fontWeight: 700, color: m.color, fontFamily: "Georgia, serif" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por email, nome ou Order ID..."
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "10px 16px",
            color: "#f5f0ff",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["customers", "purchases"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: tab === t ? "#7c3aed" : "rgba(255,255,255,0.07)",
              color: tab === t ? "#fff" : "#9575cd",
            }}
          >
            {t === "customers" ? `Clientes (${filteredCustomers.length})` : `Compras (${filteredPurchases.length})`}
          </button>
        ))}
      </div>

      {/* Tabela Clientes */}
      {tab === "customers" && (
        <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nome", "Email", "Plano", "Order ID", "Desde"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "#9575cd" }}>Nenhum cliente encontrado</td></tr>
              ) : filteredCustomers.map(c => (
                <tr key={c.id}>
                  <td style={tdStyle}>{c.name || "—"}</td>
                  <td style={tdStyle}>{c.email}</td>
                  <td style={tdStyle}>
                    <span style={{ color: planColor[c.plan] ?? "#fff", fontWeight: 600, textTransform: "capitalize" }}>
                      {c.plan}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{c.kiwify_order_id || "—"}</td>
                  <td style={tdStyle}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela Compras */}
      {tab === "purchases" && (
        <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Data", "Email", "Evento", "Plano", "Valor", "Order ID"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "#9575cd" }}>Nenhuma compra encontrada</td></tr>
              ) : filteredPurchases.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{fmtDate(p.created_at)}</td>
                  <td style={tdStyle}>{p.email}</td>
                  <td style={tdStyle}>{eventLabel[p.event] ?? p.event}</td>
                  <td style={tdStyle}>
                    <span style={{ color: planColor[p.plan] ?? "#fff", fontWeight: 600, textTransform: "capitalize" }}>
                      {p.plan}
                    </span>
                  </td>
                  <td style={tdStyle}>{fmtBRL(p.amount_cents)}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{p.kiwify_order_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
