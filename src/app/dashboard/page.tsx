import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanBadge } from "@/components/PlanBadge";
import { MESSAGE_LIMITS_MONTH, DAILY_LIMIT_FREE, currentMonthKey, currentDayKey } from "@/lib/plans";
import { dailyLuckyNumbers } from "@/lib/numerology";
import { getServerT } from "@/lib/i18n/server";
import type { Plan } from "@/lib/types";

const VIDEO_URL = process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL || "#";
const LIMPEZA_URL = process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL || "#";

export default async function DashboardHome() {
  const supabase = createClient();
  const { t } = getServerT();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("plan, email, messages_today, last_message_date, messages_month, last_message_month").eq("id", user!.id).maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";
  const today = currentDayKey();
  const monthKey = currentMonthKey();

  // Free: limite diario | Basic/Premium: limite mensal
  let remaining: number;
  let periodLabel: string;
  if (plan === "free") {
    const usedToday = profile?.last_message_date === today ? profile?.messages_today ?? 0 : 0;
    remaining = Math.max(0, DAILY_LIMIT_FREE - usedToday);
    periodLabel = t("dash.period_today_free");
  } else {
    const usedMonth = profile?.last_message_month === monthKey ? profile?.messages_month ?? 0 : 0;
    const limit = MESSAGE_LIMITS_MONTH[plan];
    remaining = Math.max(0, limit - usedMonth);
    periodLabel = t("dash.period_month", { limit });
  }

  const luckyNumbers = dailyLuckyNumbers(user!.id);
  const isPremium = plan === "premium";

  const firstName = (profile?.email?.split("@")[0] || "querida").split(" ")[0];
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const quick = [
    { href: "/dashboard/chat",       icon: "💬", title: t("dash.quick_chat_title"),      desc: t("dash.quick_chat_desc") },
    { href: "/dashboard/oracle",     icon: "🔮", title: t("dash.quick_oracle_title"),    desc: t("dash.quick_oracle_desc") },
    { href: "/dashboard/journal",    icon: "📖", title: t("dash.quick_journal_title"),   desc: t("dash.quick_journal_desc") },
    { href: "/dashboard/addiction",  icon: "🕯️", title: t("dash.quick_addiction_title"), desc: t("dash.quick_addiction_desc") },
  ];

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto" }}>

      {/* Saudação grande e amorosa */}
      <div style={{ marginBottom: 22 }}>
        <h1 className="serif" style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", color: "#f5f0ff", marginBottom: 6, lineHeight: 1.15 }}>
          {(() => {
            const raw = t("dash.welcome");
            // Substitui placeholder {name} marcando-o p/ destacar em dourado.
            const parts = raw.split("{name}");
            return (
              <>
                {parts[0]}
                <span style={{ color: "#e8b84b" }}>{capitalized}</span>
                {parts[1] ?? ""}
              </>
            );
          })()}
        </h1>
        <p style={{ color: "#fbf8ff", fontSize: 18, lineHeight: 1.5, fontWeight: 500 }}>
          {t("dash.greeting")}
        </p>
      </div>

      {/* Plano + restante juntos em cards grandes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
        <div className="card" style={{ padding: "18px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#c4b5fd", marginBottom: 8, fontWeight: 600 }}>{t("dash.your_plan")}</div>
          <PlanBadge plan={plan} />
          {plan !== "premium" && (
            <Link href="/#planos" style={{ display: "block", marginTop: 12, color: "#e8b84b", fontWeight: 700, fontSize: 14, textDecoration: "underline" }}>
              {t("dash.upgrade")}
            </Link>
          )}
        </div>
        <div className="card-gold" style={{ padding: "18px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 6, fontWeight: 600, lineHeight: 1.3 }}>{periodLabel}</div>
          <div className="serif" style={{ fontSize: "2.6rem", color: "#e8b84b", fontWeight: 700, lineHeight: 1 }}>{remaining}</div>
          <div style={{ fontSize: 13, color: "#9575cd", marginTop: 4 }}>
            {remaining === 1 ? t("dash.remaining_one") : t("dash.remaining_other")}
          </div>
        </div>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, color: "#f5c860", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              {t("dash.lucky_eyebrow")}
            </div>
            <div className="serif" style={{ fontSize: "1.5rem", color: "#fbf8ff", fontWeight: 600 }}>
              {t("dash.lucky_subtitle")}
            </div>
          </div>
          <span style={{ fontSize: 44 }} aria-hidden="true">{isPremium ? "🎰" : "🔒"}</span>
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
          <div style={{
            textAlign: "center",
            marginTop: 14,
            padding: "12px 16px",
            background: "rgba(232,184,75,0.12)",
            borderRadius: 12,
            border: "1px solid rgba(232,184,75,0.3)",
          }}>
            <div style={{ fontSize: 16, color: "#f5c860", fontWeight: 700, marginBottom: 2 }}>
              {t("dash.lucky_locked")}
            </div>
            <div style={{ fontSize: 14, color: "#fbf8ff" }}>
              {t("dash.lucky_tap")}
            </div>
          </div>
        )}
      </Link>

      {/* Quick access — cards grandes e claros */}
      <h2 className="serif" style={{ fontSize: "1.4rem", color: "#fbf8ff", marginBottom: 14, marginTop: 8 }}>
        {t("dash.quick_title")}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        {quick.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="card"
            style={{
              padding: "22px 20px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              minHeight: 150,
              transition: "transform .15s, border-color .15s",
              border: "1.5px solid rgba(232,184,75,0.25)",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">{q.icon}</div>
            <div className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 6, fontWeight: 700, lineHeight: 1.2 }}>{q.title}</div>
            <p style={{ fontSize: 15, color: "#fbf8ff", margin: 0, lineHeight: 1.5 }}>{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* 🕊️ Upsell: Limpeza Espiritual — destaque grande */}
      <Link
        href="/dashboard/limpeza-espiritual"
        style={{
          display: "block",
          background: "linear-gradient(135deg, #1e0040 0%, #4a1a7a 50%, #1e0040 100%)",
          border: "3px solid rgba(232,184,75,0.5)",
          borderRadius: 22,
          padding: "28px 22px",
          textDecoration: "none",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 36px rgba(232,184,75,0.18)",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 10 }} aria-hidden="true">🕊️</div>
        <div className="serif" style={{ fontSize: "1.8rem", color: "#f5c860", marginBottom: 8, fontWeight: 700 }}>
          {t("dash.upsell_h1")}
        </div>
        <p style={{ fontSize: "1rem", color: "#d9cdfc", lineHeight: 1.6, marginBottom: 14, maxWidth: 380, margin: "0 auto 14px" }}>
          {t("dash.upsell_desc")}
        </p>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(90deg, #f5c860, #e8b84b)",
          color: "#1e0040",
          padding: "18px 36px",
          borderRadius: 999,
          fontWeight: 800,
          fontSize: 17,
          boxShadow: "0 6px 22px rgba(232,184,75,0.5)",
        }}>
          {t("dash.upsell_cta")}
        </div>
      </Link>
    </div>
  );
}
