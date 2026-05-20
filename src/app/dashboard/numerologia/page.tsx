import { createClient } from "@/lib/supabase/server";
import { UpgradeLock } from "@/components/UpgradeLock";
import { BackButton } from "@/components/BackButton";
import {
  dailyLuckyNumbers,
  luckyCombinations,
  personalNumerology,
  luckyHour,
  nextRefreshHours,
} from "@/lib/numerology";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import type { Plan } from "@/lib/types";
import PersonalMapForm from "./PersonalMapForm";

export const dynamic = "force-dynamic";

const LOCALE_BY_KEY: Record<string, string> = {
  pt: "pt-BR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT", ja: "ja-JP",
};

// Bola dourada — componente visual reutilizado
function NumberBall({ n, size = "md" }: { n: number; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "clamp(2.4rem, 9vw, 3.4rem)" : size === "sm" ? "1.05rem" : "1.5rem";
  return (
    <div style={{
      aspectRatio: "1 / 1",
      background: "radial-gradient(circle at 30% 30%, #f5c860 0%, #c89a2a 70%, #8a6a1c 100%)",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 14px rgba(232,184,75,0.32), inset 0 -3px 8px rgba(0,0,0,0.22)",
      border: "2px solid #f5c860",
    }}>
      <span className="serif" style={{
        fontSize: dim,
        fontWeight: 800,
        color: "#1e0040",
        textShadow: "0 1px 0 rgba(255,255,255,0.4)",
      }}>
        {String(n).padStart(2, "0")}
      </span>
    </div>
  );
}

export default async function NumerologiaPage() {
  const supabase = createClient();
  const { t } = getServerT();
  const locale = getServerLocale();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("plan, name, email, full_name, birth_date")
    .eq("id", user!.id)
    .maybeSingle();

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
  const combinations = luckyCombinations(user!.id);
  const lucky_h = luckyHour(user!.id);
  const hours = nextRefreshHours();
  const today = new Date().toLocaleDateString(LOCALE_BY_KEY[locale] || "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const fullName = profile?.full_name || "";
  const birthDate = profile?.birth_date || "";
  const personalMap = (fullName && birthDate)
    ? personalNumerology(fullName, birthDate)
    : null;

  const firstName = (fullName || profile?.name || profile?.email?.split("@")[0] || "querida")
    .split(" ")[0];

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

      {/* SEÇÃO 1: 6 Números do Dia */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16,
        marginBottom: 36,
      }}>
        {numbers.map((n, i) => (
          <NumberBall key={i} n={n} size="lg" />
        ))}
      </div>

      {/* SEÇÃO 2: Combinações Espirituais */}
      <h2 className="serif" style={{
        fontSize: "1.6rem",
        color: "#e8b84b",
        textAlign: "center",
        marginBottom: 6,
        fontWeight: 700,
      }}>
        ✨ {t("numerology.combinations_title")}
      </h2>
      <p style={{
        fontSize: 14,
        color: "#9575cd",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 1.5,
      }}>
        {t("numerology.combinations_subtitle")}
      </p>

      {/* Combinação Forte (10 nums) */}
      <div className="card" style={{ padding: "20px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "#9575cd", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          {t("numerology.combo_forte")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {combinations.forte.map((n, i) => (
            <NumberBall key={i} n={n} size="md" />
          ))}
        </div>
      </div>

      {/* Combinação Quântica (15 nums) */}
      <div className="card" style={{ padding: "20px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "#9575cd", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          {t("numerology.combo_quantica")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {combinations.quantica.map((n, i) => (
            <NumberBall key={i} n={n} size="md" />
          ))}
        </div>
      </div>

      {/* Combinação Mística (5 nums) */}
      <div className="card" style={{ padding: "20px 18px", marginBottom: 32 }}>
        <div style={{ fontSize: 13, color: "#9575cd", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          {t("numerology.combo_mistica")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {combinations.mistica.map((n, i) => (
            <NumberBall key={i} n={n} size="md" />
          ))}
        </div>
      </div>

      {/* SEÇÃO 3: Mapa Numerológico Pessoal */}
      <h2 className="serif" style={{
        fontSize: "1.6rem",
        color: "#e8b84b",
        textAlign: "center",
        marginBottom: 6,
        fontWeight: 700,
      }}>
        🔮 {t("numerology.personal_title")}
      </h2>
      <p style={{
        fontSize: 14,
        color: "#9575cd",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 1.5,
      }}>
        {t("numerology.personal_subtitle")}
      </p>

      {personalMap ? (
        <div className="card-gold" style={{ padding: "26px 22px", marginBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
            <PersonalNumber label={t("numerology.personal_destino")} value={personalMap.destino} />
            <PersonalNumber label={t("numerology.personal_alma")} value={personalMap.alma} />
            <PersonalNumber label={t("numerology.personal_expressao")} value={personalMap.expressao} />
            <PersonalNumber label={t("numerology.personal_ano")} value={personalMap.anoPessoal} />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 32 }}>
          <PersonalMapForm initialName={profile?.name || ""} />
        </div>
      )}

      {/* SEÇÃO 4: Hora da Sorte */}
      <div className="card" style={{
        padding: "26px 22px",
        marginBottom: 28,
        textAlign: "center",
        background: "linear-gradient(135deg, rgba(232,184,75,0.10), rgba(126,232,248,0.06))",
        border: "1.5px solid rgba(232,184,75,0.4)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">🕰️</div>
        <div style={{ fontSize: 13, color: "#9575cd", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          {t("numerology.hour_title")}
        </div>
        <div className="serif" style={{ fontSize: "3.4rem", color: "#e8b84b", fontWeight: 800, lineHeight: 1 }}>
          {lucky_h}
        </div>
        <p style={{ fontSize: 14, color: "#c4b5fd", marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
          {t("numerology.hour_subtitle")}
        </p>
      </div>

      {/* Como interpretar (mantém da versão antiga) */}
      <div className="card" style={{ padding: "24px 22px", marginBottom: 18, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }} aria-hidden="true">✨</div>
        <h2 className="serif" style={{ fontSize: "1.3rem", color: "#e8b84b", marginBottom: 10 }}>
          {t("numerology.howto_h2")}
        </h2>
        <p style={{ fontSize: "1rem", color: "#d9cdfc", lineHeight: 1.75 }}>
          {t("numerology.howto_desc")}
        </p>
      </div>

      {/* Refresh */}
      <div className="card-gold" style={{ padding: "20px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">🌙</div>
        <p style={{ fontSize: "1rem", color: "#fbf8ff", lineHeight: 1.6, margin: 0 }}>
          {t("numerology.come_back_part1")}{" "}
          <strong style={{ color: "#f5c860", fontSize: "1.2rem" }}>{hours}</strong>
          {t("numerology.come_back_part2")}
        </p>
      </div>

      {/* Disclaimer obrigatório */}
      <p style={{
        textAlign: "center",
        color: "#7c6899",
        fontSize: 12,
        marginTop: 22,
        fontStyle: "italic",
        lineHeight: 1.6,
      }}>
        {t("plans.premium.numerologia_disclaimer")}
      </p>
    </div>
  );
}

function PersonalNumber({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.18)",
      border: "1px solid rgba(232,184,75,0.3)",
      borderRadius: 14,
      padding: "16px 14px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 12, color: "#c4b5fd", marginBottom: 6, fontWeight: 600, lineHeight: 1.3 }}>
        {label}
      </div>
      <div className="serif" style={{ fontSize: "2.4rem", color: "#e8b84b", fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
