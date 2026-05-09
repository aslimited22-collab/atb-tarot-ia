import { createClient } from "@/lib/supabase/server";
import { UpgradeLock } from "@/components/UpgradeLock";
import { BackButton } from "@/components/BackButton";
import { dailyLuckyNumbers, nextRefreshHours } from "@/lib/numerology";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

const LOCALE_BY_KEY: Record<string, string> = {
  pt: "pt-BR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT", ja: "ja-JP",
};

export default async function NumerologiaPage() {
  const supabase = createClient();
  const { t } = getServerT();
  const locale = getServerLocale();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users").select("plan, name, email").eq("id", user!.id).maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";

  if (plan !== "premium") {
    return (
      <div style={{ padding: "24px 20px", maxWidth: 720, margin: "0 auto" }}>
        <BackButton />
        <UpgradeLock required="premium" />
      </div>
    );
  }

  const numbers = dailyLuckyNumbers(user!.id);
  const hours = nextRefreshHours();
  const today = new Date().toLocaleDateString(LOCALE_BY_KEY[locale] || "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const firstName = (profile?.name || profile?.email?.split("@")[0] || "querida").split(" ")[0];

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto", color: "#f5f0ff" }}>
      <BackButton />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 60, marginBottom: 12 }} aria-hidden="true">🍀</div>
        <h1 className="serif" style={{ fontSize: "2.4rem", color: "#e8b84b", marginBottom: 8, lineHeight: 1.15 }}>
          {t("numerology.h1")}
        </h1>
        <p style={{ fontSize: "1.15rem", color: "#c4b5fd", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>
          {t("numerology.subtitle_part1")}{" "}
          <strong style={{ color: "#f5c860" }}>{firstName}</strong>
          {t("numerology.subtitle_part2")}
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
        <div style={{ fontSize: 32, marginBottom: 10 }} aria-hidden="true">✨</div>
        <h2 className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", marginBottom: 10 }}>
          {t("numerology.howto_h2")}
        </h2>
        <p style={{ fontSize: "1.05rem", color: "#d9cdfc", lineHeight: 1.75 }}>
          {t("numerology.howto_desc")}
        </p>
      </div>

      {/* Refresh */}
      <div className="card-gold" style={{ padding: "20px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">🌙</div>
        <p style={{ fontSize: "1.05rem", color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
          {t("numerology.come_back_part1")}{" "}
          <strong style={{ color: "#f5c860", fontSize: "1.2rem" }}>{hours}</strong>
          {t("numerology.come_back_part2")}
        </p>
      </div>

      {/* Decorative */}
      <p style={{ textAlign: "center", color: "#9575cd", fontSize: "0.9rem", marginTop: 28, lineHeight: 1.6 }}>
        {t("numerology.footer")}
      </p>
    </div>
  );
}
