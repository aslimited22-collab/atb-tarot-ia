"use client";
import { useState, useMemo } from "react";
import type { InsightsProps } from "./page";
import KpiTile from "./components/KpiTile";
import UsersTable from "./components/UsersTable";
import Sparkline from "./components/Sparkline";

async function triggerRecoveryEmails(): Promise<{ ok: boolean; sent?: number; skipped?: number; errors?: number; total?: number; error?: string }> {
  try {
    const res = await fetch("/api/cron/follow-up", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "unknown" };
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network" };
  }
}

type Range = "7d" | "30d" | "all";

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtInt(value: number): string {
  return value.toLocaleString("pt-BR");
}

const APPLE_FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Roboto, sans-serif`;

export default function InsightsClient(props: InsightsProps) {
  const [range, setRange] = useState<Range>("30d");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);

  async function handleRecovery() {
    if (recoveryLoading) return;
    if (!confirm("Disparar emails de resgate pra todos os clientes que pagaram e ainda não acessaram (últimos 7 dias)?")) return;
    setRecoveryLoading(true);
    setRecoveryMsg("Enviando...");
    const result = await triggerRecoveryEmails();
    setRecoveryLoading(false);
    if (!result.ok) {
      setRecoveryMsg(`❌ Erro: ${result.error}`);
      return;
    }
    setRecoveryMsg(`✅ ${result.sent} enviados · ${result.skipped} já acessaram · ${result.errors} falhas (${result.total} total)`);
    setTimeout(() => setRecoveryMsg(null), 12000);
  }

  const { kpis, recoveryKpis, spark7d, series30d, users, generatedAt } = props;

  const rangeStats = useMemo(() => {
    if (range === "7d") {
      const slice = series30d.slice(-7);
      return {
        revenue: slice.reduce((a, p) => a + p.revenue, 0),
        orders: slice.reduce((a, p) => a + p.orders, 0),
        messages: slice.reduce((a, p) => a + p.messages, 0),
      };
    }
    if (range === "30d") {
      return {
        revenue: kpis.revenue30d,
        orders: series30d.reduce((a, p) => a + p.orders, 0),
        messages: series30d.reduce((a, p) => a + p.messages, 0),
      };
    }
    return {
      revenue: kpis.revenueAllTime,
      orders: kpis.totalOrders,
      messages: kpis.messagesTotal,
    };
  }, [range, kpis, series30d]);

  const rangeLabel = range === "7d" ? "7 dias" : range === "30d" ? "30 dias" : "Tudo";

  const generatedDate = new Date(generatedAt);
  const generatedStr = generatedDate.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f7",
        color: "#1d1d1f",
        fontFamily: APPLE_FONT,
        WebkitFontSmoothing: "antialiased",
        padding: "40px 32px 80px",
      }}
    >
      <style>{`
        .insights-root, .insights-root h1, .insights-root h2, .insights-root h3,
        .insights-root input, .insights-root button, .insights-root table {
          font-family: ${APPLE_FONT} !important;
        }
        .insights-root tr:hover td {
          background: rgba(0,0,0,0.02);
        }
      `}</style>
      <div className="insights-root" style={{ maxWidth: 1320, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <a
            href="/admin"
            style={{
              color: "#86868b",
              fontSize: 14,
              textDecoration: "none",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            ← Admin
          </a>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 36,
                  color: "#1d1d1f",
                  fontWeight: 700,
                  letterSpacing: "-0.035em",
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                Insights
              </h1>
              <p
                style={{
                  fontSize: 15,
                  color: "#86868b",
                  margin: "4px 0 0",
                  fontWeight: 500,
                }}
              >
                Atualizado em {generatedStr}
              </p>
            </div>

            {/* Segmented control iOS */}
            <div
              style={{
                background: "#e8e8ed",
                borderRadius: 10,
                padding: 2,
                display: "inline-flex",
                gap: 0,
              }}
              role="tablist"
            >
              {(["7d", "30d", "all"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    background: range === r ? "#ffffff" : "transparent",
                    border: "none",
                    color: "#1d1d1f",
                    padding: "7px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.15s",
                    boxShadow: range === r ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    fontFamily: "inherit",
                    minWidth: 60,
                  }}
                >
                  {r === "7d" ? "7 dias" : r === "30d" ? "30 dias" : "Tudo"}
                </button>
              ))}
            </div>
          </div>

          {/* Botão de resgate manual — dispara emails pra quem comprou mas não acessou */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={handleRecovery}
              disabled={recoveryLoading}
              style={{
                background: recoveryLoading ? "#cccccc" : "linear-gradient(135deg, #e8b84b, #c9950a)",
                color: "#120025",
                fontWeight: 700,
                fontSize: 14,
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                cursor: recoveryLoading ? "wait" : "pointer",
                boxShadow: "0 2px 8px rgba(232,184,75,0.3)",
              }}
            >
              {recoveryLoading ? "Enviando..." : "🔁 Disparar resgates pendentes"}
            </button>
            {recoveryMsg && (
              <span style={{ fontSize: 13, color: "#1d1d1f", fontWeight: 500 }}>{recoveryMsg}</span>
            )}
          </div>
        </div>

        {/* KPI Grid */}
        <section style={{ marginBottom: 32 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <KpiTile
              label={`Receita · ${rangeLabel}`}
              value={fmtBRL(rangeStats.revenue)}
              sparkData={spark7d.revenue}
              sparkColor="#0071e3"
            />
            <KpiTile
              label={`Pedidos · ${rangeLabel}`}
              value={fmtInt(rangeStats.orders)}
              sparkData={spark7d.orders}
              sparkColor="#30d158"
            />
            <KpiTile
              label="Assinantes ativos"
              value={fmtInt(kpis.activeSubscribers)}
              sublabel="Basic + Premium"
            />
            <KpiTile
              label="Créditos comprados"
              value={fmtInt(kpis.creditsTotalPurchased)}
              sublabel="Perguntas avulsas — total histórico"
            />
            <KpiTile
              label={`Mensagens · ${rangeLabel}`}
              value={fmtInt(rangeStats.messages)}
              sparkData={spark7d.messages}
              sparkColor="#ff9500"
            />
            <KpiTile
              label="Taxa de reembolso"
              value={`${kpis.refundRatePct.toFixed(1)}%`}
              sublabel="Cancelamentos / vendas"
            />
          </div>
        </section>

        {/* Recovery & UX 60+ — mede impacto dos sprints 1+2 (baseline 49% acesso) */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 19, color: "#1d1d1f", fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
            Recovery & UX 60+ · últimos 7 dias
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <KpiTile
              label="🎯 Taxa de acesso pós-compra"
              value={`${recoveryKpis.accessRate7dPct.toFixed(1)}%`}
              sublabel={`${recoveryKpis.purchases7d} compras · baseline 49%`}
            />
            <KpiTile
              label="📬 Recovery emails enviados"
              value={fmtInt(recoveryKpis.recoverySent7d)}
              sublabel="Follow-up automático 4h+"
            />
            <KpiTile
              label="🔗 Fuzzy matches"
              value={fmtInt(recoveryKpis.fuzzyMatches7d)}
              sublabel="Mismatch email resolvido auto"
            />
            <KpiTile
              label="📤 Emails na fila"
              value={fmtInt(recoveryKpis.emailQueuePending)}
              sublabel={recoveryKpis.emailQueuePending > 0 ? "🔁 aguardando retry" : "✅ vazia"}
            />
          </div>
        </section>

        {/* Atividade 30 dias — chart inline simples */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 18,
            padding: "24px 26px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.05)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 18,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 19,
                  color: "#1d1d1f",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                Atividade · últimos 30 dias
              </h2>
              <p style={{ fontSize: 13, color: "#86868b", margin: 0, fontWeight: 500 }}>
                Receita diária e mensagens trocadas
              </p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div>
              <div style={{ fontSize: 12, color: "#86868b", fontWeight: 600, marginBottom: 6 }}>RECEITA</div>
              <Sparkline data={series30d.map((p) => p.revenue)} color="#0071e3" width={560} height={120} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#86868b", fontWeight: 600, marginBottom: 6 }}>MENSAGENS</div>
              <Sparkline data={series30d.map((p) => p.messages)} color="#ff9500" width={560} height={120} />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#86868b",
              marginTop: 8,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>{series30d[0]?.date.slice(5) ?? ""}</span>
            <span>{series30d[Math.floor(series30d.length / 2)]?.date.slice(5) ?? ""}</span>
            <span>{series30d[series30d.length - 1]?.date.slice(5) ?? ""}</span>
          </div>
        </section>

        {/* Users Table */}
        <UsersTable users={users} />

        <p
          style={{
            fontSize: 12,
            color: "#86868b",
            textAlign: "center",
            marginTop: 32,
            fontWeight: 500,
          }}
        >
          Página privada · {users.length} usuários · dados em tempo real
        </p>
      </div>
    </div>
  );
}
