import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanBadge } from "@/components/PlanBadge";
import { MESSAGE_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/types";

const quick = [
  { href: "/dashboard/chat",       icon: "💬", title: "Chat com ATB",        desc: "Converse com sua tarologa." },
  { href: "/dashboard/oracle",     icon: "🔮", title: "Oráculo Diário",       desc: "Sua carta do dia." },
  { href: "/dashboard/journal",    icon: "📖", title: "Diário da Ansiedade",  desc: "Registre seus sentimentos." },
  { href: "/dashboard/addiction",  icon: "🕯️", title: "Guia de Vícios",       desc: "Rompa padrões espirituais." },
];

export default async function DashboardHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("plan, email, messages_today, last_message_date").eq("id", user!.id).maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";
  const today = new Date().toISOString().slice(0, 10);
  const used = profile?.last_message_date === today ? profile?.messages_today ?? 0 : 0;
  const limit = MESSAGE_LIMITS[plan];
  const remaining = limit === Infinity ? "∞" : Math.max(0, limit - used);

  return (
    <div style={{ padding: "24px 20px", maxWidth: 700, margin: "0 auto" }}>

      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <h1 className="serif" style={{ fontSize: "2rem", color: "#f5f0ff", marginBottom: 4 }}>Bem-vindo(a)</h1>
        <p style={{ color: "#9575cd", fontSize: 15 }}>{profile?.email || user?.email}</p>
      </div>

      {/* Plan */}
      <div className="card" style={{ padding: "18px 20px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "#9575cd", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Seu plano</div>
          <PlanBadge plan={plan} />
        </div>
        {plan !== "premium" && (
          <Link href="/#planos" className="btn-gold" style={{ padding: "10px 20px", fontSize: 14 }}>Fazer Upgrade</Link>
        )}
      </div>

      {/* Remaining */}
      <div className="card-gold" style={{ padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mensagens restantes hoje</div>
        <div className="serif" style={{ fontSize: "3rem", color: "#e8b84b", fontWeight: 700, lineHeight: 1 }}>{remaining}</div>
      </div>

      {/* Quick access */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className="card" style={{ padding: "20px", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>{q.icon}</div>
            <div className="serif" style={{ fontSize: "1.1rem", color: "#e8b84b", marginBottom: 4 }}>{q.title}</div>
            <p style={{ fontSize: 14, color: "#c4b5fd", margin: 0 }}>{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
