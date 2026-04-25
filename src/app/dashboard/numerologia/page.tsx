import { createClient } from "@/lib/supabase/server";
import { UpgradeLock } from "@/components/UpgradeLock";
import { dailyLuckyNumbers, nextRefreshHours } from "@/lib/numerology";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NumerologiaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("plan, name, email").eq("id", user!.id).maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";

  if (plan !== "premium") {
    return <UpgradeLock required="premium" />;
  }

  const numbers = dailyLuckyNumbers(user!.id);
  const hours = nextRefreshHours();
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const firstName = (profile?.name || profile?.email?.split("@")[0] || "querida").split(" ")[0];

  return (
    <div style={{ padding: "32px 20px 80px", maxWidth: 720, margin: "0 auto", color: "#f5f0ff" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>🍀</div>
        <h1 className="serif" style={{ fontSize: "2.4rem", color: "#e8b84b", marginBottom: 8, lineHeight: 1.15 }}>
          Seus Números da Sorte
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#c4b5fd", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
          Olá, <strong style={{ color: "#f5c860" }}>{firstName}</strong>! Estes são os 6 números que o universo escolheu para você hoje.
        </p>
        <p style={{ fontSize: "0.95rem", color: "#9575cd", marginTop: 6 }}>
          {today}
        </p>
      </div>

      {/* Numbers Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        marginBottom: 32,
      }}>
        {numbers.map((n, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1 / 1",
              background: "radial-gradient(circle at 30% 30%, #f5c860 0%, #c89a2a 70%, #8a6a1c 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(232,184,75,0.35), inset 0 -4px 12px rgba(0,0,0,0.25)",
              border: "3px solid #f5c860",
              position: "relative",
            }}
          >
            <span
              className="serif"
              style={{
                fontSize: "clamp(2.2rem, 9vw, 3.4rem)",
                fontWeight: 800,
                color: "#1e0040",
                textShadow: "0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              {String(n).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div className="card" style={{ padding: "24px 22px", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>✨</div>
        <h2 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 10 }}>
          Como usar seus números
        </h2>
        <p style={{ fontSize: "1.05rem", color: "#d9cdfc", lineHeight: 1.75 }}>
          Anote esses números em um papel e guarde com você durante o dia. Use na sua loteria, no jogo do bicho, ou onde sentir no coração. A energia deles está com você até a meia-noite.
        </p>
      </div>

      {/* Refresh */}
      <div className="card-gold" style={{ padding: "20px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🌙</div>
        <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
          Volte amanhã! Em <strong style={{ color: "#f5c860", fontSize: "1.2rem" }}>{hours}h</strong> você terá novos números da sorte.
        </p>
      </div>

      {/* Decorative */}
      <p style={{ textAlign: "center", color: "#9575cd", fontSize: "0.9rem", marginTop: 28, lineHeight: 1.6 }}>
        🌟 Que a sorte ilumine seu caminho 🌟
      </p>
    </div>
  );
}
