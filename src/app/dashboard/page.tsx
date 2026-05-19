import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanBadge } from "@/components/PlanBadge";
import { MESSAGE_LIMITS_MONTH, DAILY_LIMIT_FREE, currentMonthKey, currentDayKey, isPaidPlan } from "@/lib/plans";
import { dailyLuckyNumbers } from "@/lib/numerology";
import { reconcileChatCredits } from "@/lib/reconcileCredits";
import { getServerT } from "@/lib/i18n/server";
import type { Plan } from "@/lib/types";

const VIDEO_URL = process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL || "#";
const LIMPEZA_URL = process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL || "#";
// Basic/Premium agora passam pelo roteador /api/checkout/[plan] (BR/intl split).

export default async function DashboardHome() {
  const supabase = createClient();
  const { t } = getServerT();
  const { data: { user } } = await supabase.auth.getUser();

  // Reconcilia créditos órfãos antes de ler perfil. Cobre o caso do cliente
  // pagar pergunta avulsa e chegar aqui antes do webhook do Kiwify processar.
  if (user) {
    const admin = createAdminClient();
    await reconcileChatCredits(admin, user.id, user.email || "");
  }

  const { data: profile } = await supabase
    .from("users").select("plan, email, messages_today, last_message_date, messages_month, last_message_month, chat_credits_balance").eq("id", user!.id).maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";
  const creditsBalance = (profile?.chat_credits_balance as number | undefined) ?? 0;
  const hasCredits = creditsBalance > 0;

  // Gate: sem plano pago E sem créditos avulsos = tela "Escolha seu plano".
  // Cliente que comprou pergunta1/3/7 (R$14,90/19,90/39,90) tem plan="free" mas
  // chat_credits_balance > 0 — DEVE ver o dashboard com CTA pro chat.
  if (!isPaidPlan(plan) && !hasCredits) {
    return (
      <div style={{ padding: "32px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 80, marginBottom: 16 }} aria-hidden="true">💛</div>
          <h1 className="serif" style={{ fontSize: "clamp(2.2rem, 5vw, 2.8rem)", color: "#f5f0ff", marginBottom: 14, lineHeight: 1.2, fontWeight: 700 }}>
            {t("dash.pending_h1")}
          </h1>
          <p style={{ color: "#fbf8ff", fontSize: 21, lineHeight: 1.55, fontWeight: 500, maxWidth: 560, margin: "0 auto" }}>
            {t("dash.pending_desc")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 }}>
          {/* Basic */}
          <div className="card" style={{ padding: "32px 26px", display: "flex", flexDirection: "column", border: "2px solid rgba(232,184,75,0.4)" }}>
            <h2 className="serif" style={{ fontSize: "1.8rem", color: "#e8b84b", marginBottom: 6, fontWeight: 700 }}>{t("checkout.title.fullAccess")}</h2>
            <div style={{ fontSize: "2.6rem", fontWeight: 800, color: "#f5f0ff", marginBottom: 22, lineHeight: 1 }}>
              R$29 <span style={{ fontSize: 19, fontWeight: 400, color: "#c4b5fd" }}>{t("price.perMonth")}</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 26px", flex: 1 }}>
              <li style={{ color: "#f5f0ff", marginBottom: 12, fontSize: 19, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.basic.f1")}</li>
              <li style={{ color: "#f5f0ff", marginBottom: 12, fontSize: 19, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.basic.f2")}</li>
              <li style={{ color: "#f5f0ff", marginBottom: 12, fontSize: 19, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.basic.f3")}</li>
              <li style={{ color: "#c4b5fd", fontSize: 19, lineHeight: 1.5 }}>{t("plans.basic.f4")}</li>
            </ul>
            <a href="/api/checkout/basic" className="btn-gold btn-big" style={{ textAlign: "center", display: "block", padding: "20px 24px", fontSize: "1.2rem", fontWeight: 800, textDecoration: "none", border: "none" }}>
              {t("checkout.cta.access")}
            </a>
          </div>

          {/* Premium */}
          <div className="card-gold" style={{ padding: "32px 26px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, fontWeight: 800, background: "#e8b84b", color: "#120025", borderRadius: 999, padding: "6px 18px", display: "inline-block", marginBottom: 14, alignSelf: "flex-start", letterSpacing: "0.05em" }}>{t("plans.premium.badge")}</div>
            <h2 className="serif" style={{ fontSize: "1.8rem", color: "#e8b84b", marginBottom: 6, fontWeight: 700 }}>{t("checkout.title.madameAriel")}</h2>
            <div style={{ fontSize: "2.6rem", fontWeight: 800, color: "#f5f0ff", marginBottom: 22, lineHeight: 1 }}>
              R$250 <span style={{ fontSize: 19, fontWeight: 400, color: "#c4b5fd" }}>{t("price.perMonth")}</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 26px", flex: 1 }}>
              <li style={{ color: "#f5f0ff", marginBottom: 12, fontSize: 19, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.premium.f1")}</li>
              <li style={{ color: "#f5f0ff", marginBottom: 12, fontSize: 19, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.premium.f2")}</li>
              <li style={{ color: "#f5f0ff", marginBottom: 12, fontSize: 19, fontWeight: 500, lineHeight: 1.5 }}>{t("plans.premium.f3")}</li>
              <li style={{ color: "#f5f0ff", fontSize: 19, lineHeight: 1.5 }}>{t("plans.premium.f4")}</li>
            </ul>
            <a href="/api/checkout/premium" className="btn-gold btn-big" style={{ textAlign: "center", display: "block", padding: "20px 24px", fontSize: "1.2rem", fontWeight: 800, textDecoration: "none", border: "none" }}>
              {t("checkout.cta.startReading")}
            </a>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link
            href="/"
            style={{
              display: "inline-block",
              color: "#c4b5fd",
              fontSize: 18,
              fontWeight: 600,
              textDecoration: "none",
              padding: "16px 24px",
              minHeight: 56,
              borderRadius: 12,
              background: "rgba(196,181,253,0.08)",
              border: "1.5px solid rgba(196,181,253,0.25)",
            }}
          >
            ← {t("v2.back")}
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Dashboard normal (plan === basic ou premium) ----------
  const today = currentDayKey();
  const monthKey = currentMonthKey();

  // Free com créditos: mostra saldo de perguntas avulsas (precedência)
  // Free sem créditos: cota diária (mas gate acima já bloqueia isso)
  // Basic/Premium: limite mensal
  let remaining: number;
  let periodLabel: string;
  if (hasCredits) {
    remaining = creditsBalance;
    periodLabel = creditsBalance === 1 ? "Pergunta restante" : "Perguntas restantes";
  } else if (plan === "free") {
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

      {/* Saudação grande e amorosa — UX 45+ */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: "clamp(2.2rem, 5vw, 2.8rem)", color: "#f5f0ff", marginBottom: 10, lineHeight: 1.15, fontWeight: 700 }}>
          {(() => {
            const raw = t("dash.welcome");
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
        <p style={{ color: "#fbf8ff", fontSize: 20, lineHeight: 1.55, fontWeight: 500 }}>
          {t("dash.greeting")}
        </p>
      </div>

      {/* CTA destacado para quem comprou pergunta avulsa (créditos disponíveis) */}
      {hasCredits && (
        <Link
          href="/dashboard/chat"
          style={{
            display: "block",
            background: "linear-gradient(135deg, #e8b84b, #c9950a)",
            color: "#120025",
            fontWeight: 800,
            fontSize: 21,
            padding: "24px 28px",
            borderRadius: 18,
            textDecoration: "none",
            textAlign: "center",
            minHeight: 80,
            marginBottom: 24,
            boxShadow: "0 12px 28px rgba(232,184,75,0.45)",
            lineHeight: 1.3,
          }}
        >
          💬 Você tem {creditsBalance} {creditsBalance === 1 ? "pergunta" : "perguntas"} — fazer agora
        </Link>
      )}

      {/* Plano + restante — cards maiores, fontes 45+ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 26 }}>
        <div className="card" style={{ padding: "22px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "#c4b5fd", marginBottom: 10, fontWeight: 700, letterSpacing: "0.05em" }}>{t("dash.your_plan")}</div>
          <PlanBadge plan={plan} />
          {plan !== "premium" && (
            <Link
              href="/#planos"
              style={{
                display: "inline-block",
                marginTop: 16,
                color: "#e8b84b",
                fontWeight: 700,
                fontSize: 17,
                textDecoration: "underline",
                padding: "10px 16px",
                minHeight: 44,
              }}
            >
              {t("dash.upgrade")}
            </Link>
          )}
        </div>
        <div className="card-gold" style={{ padding: "22px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#c4b5fd", marginBottom: 8, fontWeight: 700, lineHeight: 1.35 }}>{periodLabel}</div>
          <div className="serif" style={{ fontSize: "3rem", color: "#e8b84b", fontWeight: 800, lineHeight: 1 }}>{remaining}</div>
          <div style={{ fontSize: 15, color: "#c4b5fd", marginTop: 6, fontWeight: 500 }}>
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
            marginTop: 16,
            padding: "16px 20px",
            background: "rgba(232,184,75,0.14)",
            borderRadius: 14,
            border: "1.5px solid rgba(232,184,75,0.35)",
          }}>
            <div style={{ fontSize: 18, color: "#f5c860", fontWeight: 700, marginBottom: 4 }}>
              {t("dash.lucky_locked")}
            </div>
            <div style={{ fontSize: 16, color: "#fbf8ff", fontWeight: 500 }}>
              {t("dash.lucky_tap")}
            </div>
          </div>
        )}
      </Link>

      {/* Quick access — cards grandes e claros UX 45+ */}
      <h2 className="serif" style={{ fontSize: "1.6rem", color: "#fbf8ff", marginBottom: 18, marginTop: 12, fontWeight: 700 }}>
        {t("dash.quick_title")}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 32 }}>
        {quick.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="card"
            style={{
              padding: "24px 22px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              minHeight: 168,
              transition: "transform .15s, border-color .15s",
              border: "2px solid rgba(232,184,75,0.3)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 14 }} aria-hidden="true">{q.icon}</div>
            <div className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 8, fontWeight: 700, lineHeight: 1.2 }}>{q.title}</div>
            <p style={{ fontSize: 17, color: "#fbf8ff", margin: 0, lineHeight: 1.55, fontWeight: 500 }}>{q.desc}</p>
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
        <div style={{ fontSize: 72, marginBottom: 12 }} aria-hidden="true">🕊️</div>
        <div className="serif" style={{ fontSize: "2rem", color: "#f5c860", marginBottom: 12, fontWeight: 700 }}>
          {t("dash.upsell_h1")}
        </div>
        <p style={{ fontSize: "1.1rem", color: "#fbf8ff", lineHeight: 1.6, marginBottom: 18, maxWidth: 420, margin: "0 auto 18px", fontWeight: 500 }}>
          {t("dash.upsell_desc")}
        </p>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(90deg, #f5c860, #e8b84b)",
          color: "#1e0040",
          padding: "20px 40px",
          minHeight: 64,
          borderRadius: 999,
          fontWeight: 800,
          fontSize: 19,
          boxShadow: "0 6px 22px rgba(232,184,75,0.5)",
        }}>
          {t("dash.upsell_cta")}
        </div>
      </Link>
    </div>
  );
}
