"use client";
import { useState, useMemo } from "react";
import type { UserRow } from "../page";

type SortKey = "name" | "plan" | "creditsBalance" | "messagesSent" | "lastMessageAt" | "totalSpentCents" | "createdAt";
type SortDir = "asc" | "desc";

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))}min`;
  if (diff < day) return `${Math.floor(diff / 3600_000)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}sem`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function maskEmail(email: string, show: boolean): string {
  if (show) return email;
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 3);
  return `${visible}${user.length > 3 ? "•••" : ""}@${domain}`;
}

const PLAN_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  free: { bg: "rgba(134,134,139,0.12)", color: "#86868b", label: "Free" },
  basic: { bg: "rgba(0,113,227,0.12)", color: "#0071e3", label: "Basic" },
  premium: { bg: "rgba(48,209,88,0.14)", color: "#1d8e3e", label: "Premium" },
};

export default function UsersTable({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [revealedEmails, setRevealedEmails] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let rows = users;
    if (q) {
      rows = users.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name ?? "").toLowerCase().includes(q) ||
          u.plan.toLowerCase().includes(q)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [users, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleReveal(id: string) {
    setRevealedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const th: React.CSSProperties = {
    padding: "14px 16px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: "#86868b",
    letterSpacing: "-0.01em",
    borderBottom: "1px solid #e5e5ea",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const td: React.CSSProperties = {
    padding: "14px 16px",
    fontSize: 14,
    color: "#1d1d1f",
    borderBottom: "1px solid #f2f2f7",
    fontWeight: 400,
    whiteSpace: "nowrap",
  };

  const sortMark = (k: SortKey) => (sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      {/* Header com busca */}
      <div
        style={{
          padding: "20px 22px",
          borderBottom: "1px solid #e5e5ea",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2
            style={{
              fontSize: 19,
              color: "#1d1d1f",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              margin: 0,
              marginBottom: 2,
            }}
          >
            Usuários
          </h2>
          <p style={{ fontSize: 13, color: "#86868b", margin: 0, fontWeight: 500 }}>
            {filtered.length} {filtered.length === 1 ? "pessoa" : "pessoas"}
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou plano"
          style={{
            background: "#f5f5f7",
            border: "1px solid #d2d2d7",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 14,
            color: "#1d1d1f",
            outline: "none",
            minWidth: 260,
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Tabela */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th} onClick={() => toggleSort("name")}>Nome{sortMark("name")}</th>
              <th style={th}>Email</th>
              <th style={th} onClick={() => toggleSort("plan")}>Plano{sortMark("plan")}</th>
              <th style={{ ...th, textAlign: "right" }} onClick={() => toggleSort("creditsBalance")}>
                Créditos{sortMark("creditsBalance")}
              </th>
              <th style={{ ...th, textAlign: "right" }} onClick={() => toggleSort("messagesSent")}>
                Mensagens{sortMark("messagesSent")}
              </th>
              <th style={th} onClick={() => toggleSort("lastMessageAt")}>
                Última atividade{sortMark("lastMessageAt")}
              </th>
              <th style={{ ...th, textAlign: "right" }} onClick={() => toggleSort("totalSpentCents")}>
                Gasto{sortMark("totalSpentCents")}
              </th>
              <th style={th} onClick={() => toggleSort("createdAt")}>Cadastro{sortMark("createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...td, textAlign: "center", color: "#86868b", padding: "48px" }}>
                  Nenhum usuário encontrado
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const badge = PLAN_BADGE[u.plan] ?? PLAN_BADGE.free;
                return (
                  <tr key={u.id} style={{ transition: "background 0.1s" }}>
                    <td style={td}>
                      <span style={{ fontWeight: 500 }}>
                        {u.name?.trim() || <span style={{ color: "#86868b" }}>—</span>}
                      </span>
                    </td>
                    <td
                      style={{ ...td, color: "#86868b", cursor: "pointer", fontSize: 13 }}
                      onClick={() => toggleReveal(u.id)}
                      title={revealedEmails.has(u.id) ? "Clique para ocultar" : "Clique para revelar"}
                    >
                      {maskEmail(u.email, revealedEmails.has(u.id))}
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      <span style={{ fontWeight: 500 }}>{u.creditsBalance}</span>
                      {u.creditsTotalPurchased > 0 && (
                        <span style={{ color: "#86868b", fontSize: 12, marginLeft: 4 }}>
                          / {u.creditsTotalPurchased}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                      {u.messagesSent}
                    </td>
                    <td style={{ ...td, color: u.lastMessageAt ? "#1d1d1f" : "#86868b" }}>
                      {fmtRelative(u.lastMessageAt)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 500,
                        color: u.totalSpentCents > 0 ? "#1d1d1f" : "#86868b",
                      }}
                    >
                      {u.totalSpentCents > 0 ? fmtBRL(u.totalSpentCents) : "—"}
                    </td>
                    <td style={{ ...td, color: "#86868b", fontSize: 13 }}>
                      {fmtRelative(u.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
