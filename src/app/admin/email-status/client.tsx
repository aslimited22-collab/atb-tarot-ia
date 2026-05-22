"use client";
import { useState, useMemo } from "react";
import type { EmailStatusProps, EmailRow } from "./page";
import KpiTile from "../insights/components/KpiTile";

const APPLE_FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Roboto, sans-serif`;

type Filter = "all" | "sent" | "pending" | "failed";

function statusOf(row: EmailRow): Filter {
  if (row.sent_at) return "sent";
  if (row.attempts >= 6) return "failed";
  return "pending";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmailStatusClient(props: EmailStatusProps) {
  const { kpis, rows, generatedAt } = props;
  const [filter, setFilter] = useState<Filter>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => statusOf(r) === filter);
  }, [rows, filter]);

  async function retryOne(id: string) {
    if (retryingId) return;
    setRetryingId(id);
    try {
      const res = await fetch(`/api/admin/email-retry/${id}`, { method: "POST" });
      if (res.ok) {
        location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        alert("Erro: " + (data.error || "unknown"));
      }
    } catch (e) {
      alert("Erro de rede");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", color: "#1d1d1f", fontFamily: APPLE_FONT, padding: "40px 32px 80px" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <a href="/admin" style={{ color: "#86868b", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
            ← Admin
          </a>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.035em", margin: "8px 0 4px", lineHeight: 1.1 }}>
            Email Status
          </h1>
          <p style={{ fontSize: 15, color: "#86868b", margin: 0, fontWeight: 500 }}>
            Últimos 7 dias · gerado em {new Date(generatedAt).toLocaleString("pt-BR")}
          </p>
        </div>

        {/* KPI grid */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <KpiTile label="Total enviados (7d)" value={kpis.total.toLocaleString("pt-BR")} />
            <KpiTile label="✅ Entregues" value={kpis.sent.toLocaleString("pt-BR")} sublabel={`${kpis.total > 0 ? ((kpis.sent / kpis.total) * 100).toFixed(1) : "0"}%`} />
            <KpiTile label="⏳ Na fila" value={kpis.pending.toLocaleString("pt-BR")} sublabel="aguardando retry" />
            <KpiTile label="❌ Falharam (>6 tentativas)" value={kpis.failed.toLocaleString("pt-BR")} sublabel="precisam reenvio manual" />
          </div>
        </section>

        {/* Filtros */}
        <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["all", "sent", "pending", "failed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? "#0071e3" : "#fff",
                color: filter === f ? "#fff" : "#1d1d1f",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {f === "all" ? "Todos" : f === "sent" ? "Enviados" : f === "pending" ? "Pendentes" : "Falharam"}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <section style={{ background: "#fff", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9f9fb", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#86868b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#86868b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Destino</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#86868b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assunto</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#86868b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Escopo</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#86868b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tent.</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#86868b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Criado</th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#86868b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Último erro</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#86868b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#86868b" }}>Nenhum registro</td></tr>
              )}
              {filtered.map((row) => {
                const st = statusOf(row);
                const stColor = st === "sent" ? "#30d158" : st === "failed" ? "#ff3b30" : "#ff9500";
                const stEmoji = st === "sent" ? "✅" : st === "failed" ? "❌" : "⏳";
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 600, color: stColor }}>{stEmoji} {st}</td>
                    <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12 }}>{row.to_email}</td>
                    <td style={{ padding: "10px 16px", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.subject}>{row.subject}</td>
                    <td style={{ padding: "10px 16px", color: "#86868b", fontSize: 11 }}>{row.scope}</td>
                    <td style={{ padding: "10px 16px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{row.attempts}</td>
                    <td style={{ padding: "10px 16px", color: "#86868b", fontSize: 12 }}>{fmtDate(row.created_at)}</td>
                    <td style={{ padding: "10px 16px", color: "#ff3b30", fontSize: 11, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.last_error || ""}>
                      {row.last_error || "—"}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      {st !== "sent" && (
                        <button
                          onClick={() => retryOne(row.id)}
                          disabled={retryingId === row.id}
                          style={{
                            background: "#0071e3",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: retryingId === row.id ? "wait" : "pointer",
                          }}
                        >
                          {retryingId === row.id ? "..." : "🔁 Reenviar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p style={{ fontSize: 12, color: "#86868b", textAlign: "center", marginTop: 32 }}>
          {filtered.length} de {rows.length} registros · página privada
        </p>
      </div>
    </div>
  );
}
