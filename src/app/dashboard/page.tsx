import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanBadge } from "@/components/PlanBadge";
import { MESSAGE_LIMITS } from "@/lib/plans";
import { dailyLuckyNumbers } from "@/lib/numerology";
import type { Plan } from "@/lib/types";

const quick = [
  { href: "/dashboard/chat",       icon: "💬", title: "Chat com ATB",        desc: "Converse com sua tarologa." },
  { href: "/dashboard/oracle",     icon: "🔮", title: "Oráculo Diário",       desc: "Sua carta do dia." },
  { href: "/dashboard/journal",    icon: "📖", title: "Diário da Ansiedade",  desc: "Registre seus sentimentos." },
  { href: "/dashboard/addiction",  icon: "🕯️", title: "Guia de Vícios",       desc: "Rompa padrões espirituais." },
];

const VIDEO_URL = process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL || "#";
const LIMPEZA_URL = process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL || "#";

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

  const luckyNumbers = dailyLuckyNumbers(user!.id);
  const isPremium = plan === "premium";

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

      {/* 🍀 Números da Sorte do Dia (engajamento diário) */}
      <Link
        href="/dashboard/numerologia"
        style={{
          display: "block",
          background: "linear-gradient(135deg, #2a0055 0%, #3b0764 50%, #2a0055 100%)",
          border: "2px solid rgba(232,184,75,0.5)",
          borderRadius: 18,
          padding: "20px 22px",
          marginBottom: 24,
          textDecoration: "none",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#f5c860", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              🍀 Hoje • Números da Sorte
            </div>
            <div className="serif" style={{ fontSize: "1.3rem", color: "#fbf8ff" }}>
              Veja seus 6 números do dia
            </div>
          </div>
          <span style={{ fontSize: 36 }}>{isPremium ? "🎰" : "🔒"}</span>
        </div>

        {/* Preview dos números (borrados se não for premium) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 6,
          filter: isPremium ? "none" : "blur(6px)",
          marginBottom: isPremium ? 0 : 8,
        }}>
          {luckyNumbers.map((n, i) => (
            <div key={i} style={{
              background: "radial-gradient(circle at 30% 30%, #f5c860, #c89a2a)",
              borderRadius: "50%",
              aspectRatio: "1 / 1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#1e0040",
              fontSize: "clamp(0.9rem, 3vw, 1.2rem)",
              fontFamily: "Georgia, serif",
              boxShadow: "0 3px 8px rgba(232,184,75,0.3)",
            }}>
              {String(n).padStart(2, "0")}
            </div>
          ))}
        </div>

        {!isPremium && (
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#f5c860", fontWeight: 600 }}>
            ✨ Disponível no plano Premium
          </div>
        )}
      </Link>

      {/* Quick access */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className="card" style={{ padding: "20px", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>{q.icon}</div>
            <div className="serif" style={{ fontSize: "1.1rem", color: "#e8b84b", marginBottom: 4 }}>{q.title}</div>
            <p style={{ fontSize: 14, color: "#c4b5fd", margin: 0 }}>{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* 🕊️ Upsell: Limpeza Espiritual */}
      <Link
        href="/dashboard/limpeza-espiritual"
        style={{
          display: "block",
          background: "linear-gradient(135deg, #1e0040 0%, #4a1a7a 50%, #1e0040 100%)",
          border: "2px solid rgba(245,184,212,0.4)",
          borderRadius: 18,
          padding: "22px",
          textDecoration: "none",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>🕊️</div>
        <div className="serif" style={{ fontSize: "1.5rem", color: "#f5c860", marginBottom: 6 }}>
          Limpeza Espiritual
        </div>
        <p style={{ fontSize: "1rem", color: "#d9cdfc", lineHeight: 1.6, marginBottom: 14, maxWidth: 380, margin: "0 auto 14px" }}>
          Abra caminhos, retire energias pesadas e proteja sua casa com a luz dos santos.
        </p>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(90deg, #f5c860, #e8b84b)",
          color: "#1e0040",
          padding: "12px 28px",
          borderRadius: 999,
          fontWeight: 800,
          fontSize: 15,
          boxShadow: "0 4px 16px rgba(232,184,75,0.4)",
        }}>
          ✨ Quero fazer minha limpeza
        </div>
      </Link>
    </div>
  );
}
