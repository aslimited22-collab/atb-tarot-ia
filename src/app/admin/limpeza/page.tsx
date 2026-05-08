import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

function isAuthorized(): boolean {
  // Aceita: cookie admin_secret == process.env.ADMIN_SECRET
  // OU: cookie admin_email pertencente a ADMIN_EMAILS (logado no Supabase)
  // Em produção o ideal é via /admin/page.tsx mas vamos manter simples e independente.
  const c = cookies();
  if (ADMIN_SECRET) {
    const v = c.get("admin_secret")?.value;
    if (v && v === ADMIN_SECRET) return true;
  }
  return false;
}

export default async function AdminLimpezaPage({ searchParams }: { searchParams?: { secret?: string } }) {
  // Bootstrapping: ?secret=XYZ seta cookie + recarrega
  if (searchParams?.secret && ADMIN_SECRET && searchParams.secret === ADMIN_SECRET) {
    cookies().set("admin_secret", ADMIN_SECRET, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    redirect("/admin/limpeza");
  }

  if (!isAuthorized()) {
    return (
      <main style={{ background: "#120025", color: "#fbf8ff", minHeight: "100vh", padding: "60px 20px", textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: "2rem", color: "#e8b84b", marginBottom: 16 }}>Admin · Limpeza</h1>
        <p style={{ color: "#fbf8ff", fontSize: 16, lineHeight: 1.6 }}>
          Acesso restrito. Acesse via <code>/admin/limpeza?secret=SEU_ADMIN_SECRET</code> para definir o cookie.
        </p>
      </main>
    );
  }

  const admin = createAdminClient();

  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: salesToday },
    { count: sales7d },
    { data: revenue7dRows },
    { count: previewsTotal },
    { count: paidTotal },
    { count: pendingTotal },
    { count: errorTotal },
    { data: lastOrders },
  ] = await Promise.all([
    admin.from("orders")
      .select("*", { count: "exact", head: true })
      .eq("product_type", "limpeza_espiritual")
      .eq("status", "paid")
      .gte("created_at", todayIso),
    admin.from("orders")
      .select("*", { count: "exact", head: true })
      .eq("product_type", "limpeza_espiritual")
      .eq("status", "paid")
      .gte("created_at", sevenDaysAgo),
    admin.from("orders")
      .select("amount")
      .eq("product_type", "limpeza_espiritual")
      .eq("status", "paid")
      .gte("created_at", sevenDaysAgo),
    admin.from("readings")
      .select("*", { count: "exact", head: true })
      .in("generation_status", ["preview_generated", "completed"]),
    admin.from("orders")
      .select("*", { count: "exact", head: true })
      .eq("product_type", "limpeza_espiritual")
      .eq("status", "paid"),
    admin.from("orders")
      .select("*", { count: "exact", head: true })
      .eq("product_type", "limpeza_espiritual")
      .eq("status", "pending"),
    admin.from("readings")
      .select("*", { count: "exact", head: true })
      .eq("generation_status", "error"),
    admin.from("orders")
      .select("id, name, email, status, theme, amount, created_at")
      .eq("product_type", "limpeza_espiritual")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const revenue7d = (revenue7dRows ?? []).reduce((acc, r: any) => acc + Number(r.amount || 0), 0);
  const projecaoMensal = Math.round((revenue7d / 7) * 30);
  const vendasMensaisEst = Math.round(((sales7d ?? 0) / 7) * 30);
  const conversao =
    previewsTotal && previewsTotal > 0
      ? Math.round(((paidTotal ?? 0) / previewsTotal) * 100)
      : 0;

  const Card = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 12, color: "#9575cd", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontWeight: 700 }}>
        {label}
      </div>
      <div className="serif" style={{ fontSize: "2rem", color: "#e8b84b", fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: "#c4b5fd", marginTop: 6 }}>{hint}</div>}
    </div>
  );

  return (
    <main style={{ background: "#120025", color: "#fbf8ff", minHeight: "100vh", padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <h1 className="serif" style={{ fontSize: "2.2rem", color: "#e8b84b", marginBottom: 6, fontWeight: 700 }}>
            Admin · Limpeza V2
          </h1>
          <p style={{ color: "#c4b5fd", fontSize: 14 }}>
            Métricas em tempo real do funil <code>/limpeza</code>.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}>
          <Card label="Vendas hoje" value={salesToday ?? 0} />
          <Card label="Vendas 7 dias" value={sales7d ?? 0} />
          <Card label="Receita 7 dias" value={`R$ ${revenue7d.toFixed(2)}`} />
          <Card label="Projeção mensal" value={`R$ ${projecaoMensal.toFixed(2)}`} hint={`~ ${vendasMensaisEst} vendas`} />
          <Card label="Prévias geradas" value={previewsTotal ?? 0} />
          <Card label="Conversão" value={`${conversao}%`} hint="prévia → pago" />
          <Card label="Pedidos pagos" value={paidTotal ?? 0} />
          <Card label="Pedidos pendentes" value={pendingTotal ?? 0} />
          <Card label="Pedidos com erro" value={errorTotal ?? 0} />
          <Card label="Modelo usado" value="DeepSeek" />
        </div>

        <h2 className="serif" style={{ fontSize: "1.5rem", color: "#e8b84b", marginBottom: 14, fontWeight: 700 }}>
          Últimos pedidos
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "rgba(232,184,75,0.1)", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", color: "#e8b84b", fontWeight: 700 }}>Quando</th>
                <th style={{ padding: "10px 12px", color: "#e8b84b", fontWeight: 700 }}>Nome</th>
                <th style={{ padding: "10px 12px", color: "#e8b84b", fontWeight: 700 }}>Email</th>
                <th style={{ padding: "10px 12px", color: "#e8b84b", fontWeight: 700 }}>Tema</th>
                <th style={{ padding: "10px 12px", color: "#e8b84b", fontWeight: 700 }}>Status</th>
                <th style={{ padding: "10px 12px", color: "#e8b84b", fontWeight: 700 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {(lastOrders || []).map((o: any) => (
                <tr key={o.id} style={{ borderBottom: "1px solid rgba(196,181,253,0.12)" }}>
                  <td style={{ padding: "10px 12px", color: "#c4b5fd" }}>
                    {new Date(o.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#fbf8ff" }}>{o.name}</td>
                  <td style={{ padding: "10px 12px", color: "#c4b5fd" }}>{o.email}</td>
                  <td style={{ padding: "10px 12px", color: "#c4b5fd" }}>{o.theme}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontWeight: 700,
                      background: o.status === "paid" ? "rgba(134,239,172,0.15)" : o.status === "pending" ? "rgba(232,184,75,0.15)" : "rgba(248,113,113,0.15)",
                      color: o.status === "paid" ? "#86efac" : o.status === "pending" ? "#e8b84b" : "#f87171",
                    }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#fbf8ff", fontWeight: 600 }}>R$ {o.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
