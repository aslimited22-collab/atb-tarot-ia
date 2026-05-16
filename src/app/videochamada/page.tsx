import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";

// Checkout vai pelo roteador /api/checkout/videochamada
// (decide Kiwify BR vs Stripe intl por IP).
const CHECKOUT_URL = "/api/checkout/videochamada";

export default function VideoChamadaPage() {
  const { t } = getServerT();

  const steps: Array<[string, string, string]> = [
    ["💬", t("videochamada.step1_title"), t("videochamada.step1_desc")],
    ["🃏", t("videochamada.step2_title"), t("videochamada.step2_desc")],
    ["🗺️", t("videochamada.step3_title"), t("videochamada.step3_desc")],
    ["📞", t("videochamada.step4_title"), t("videochamada.step4_desc")],
  ];

  const forYou: string[] = [
    t("videochamada.for_you_1"),
    t("videochamada.for_you_2"),
    t("videochamada.for_you_3"),
    t("videochamada.for_you_4"),
    t("videochamada.for_you_5"),
  ];

  const faqs: Array<[string, string]> = [
    [t("videochamada.faq1_q"), t("videochamada.faq1_a")],
    [t("videochamada.faq2_q"), t("videochamada.faq2_a")],
    [t("videochamada.faq3_q"), t("videochamada.faq3_a")],
  ];

  return (
    <div style={{ minHeight:"100vh", background:"radial-gradient(ellipse at 30% 0%, #3b0764 0%, #120025 70%)", color:"#f5f0ff", fontFamily:"'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ textAlign:"center", padding:"40px 20px 0" }}>
        <Link href="/" style={{ textDecoration:"none" }}>
          <span style={{ fontFamily:"Georgia, serif", fontSize:"1.5rem", color:"#e8b84b" }}>ATB ✨</span>
        </Link>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"32px 20px 60px" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:64, marginBottom:16 }} aria-hidden="true">🔮</div>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(2rem, 5vw, 2.8rem)", color:"#f5f0ff", lineHeight:1.25, marginBottom:16 }}>
            {t("videochamada.h1_line1")}<br/>
            <span style={{ color:"#e8b84b" }}>{t("videochamada.h1_line2")}<br/>{t("videochamada.h1_line3")}</span>
          </h1>
          <p style={{ fontSize:"1.15rem", color:"#c4b5fd", lineHeight:1.75, maxWidth:520, margin:"0 auto" }}>
            {t("videochamada.hero_desc_1")}<br/>
            {t("videochamada.hero_desc_2")}
          </p>
        </div>

        {/* O que é */}
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(196,181,253,0.2)", borderRadius:20, padding:"28px 24px", marginBottom:24 }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"1.5rem", color:"#e8b84b", marginBottom:20 }}>{t("videochamada.what_happens_h2")}</h2>
          {steps.map(([icon, title, desc]) => (
            <div key={title} style={{ display:"flex", gap:16, marginBottom:20 }}>
              <div style={{ fontSize:28, flexShrink:0, marginTop:2 }} aria-hidden="true">{icon}</div>
              <div>
                <div style={{ fontWeight:700, color:"#f5f0ff", fontSize:"1.05rem", marginBottom:4 }}>{title}</div>
                <div style={{ color:"#c4b5fd", fontSize:"0.95rem", lineHeight:1.65 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Depoimento / prova social */}
        <div style={{ background:"linear-gradient(135deg,#2a0055,#1e0040)", border:"1.5px solid rgba(232,184,75,0.3)", borderRadius:20, padding:"24px", marginBottom:24, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:12 }} aria-hidden="true">💛</div>
          <p style={{ fontFamily:"Georgia, serif", fontSize:"1.2rem", color:"#f5f0ff", lineHeight:1.7, fontStyle:"italic", marginBottom:16 }}>
            &ldquo;{t("videochamada.testimonial_quote")}&rdquo;
          </p>
          <div style={{ color:"#e8b84b", fontWeight:700, fontSize:"0.95rem" }}>{t("videochamada.testimonial_author")}</div>
        </div>

        {/* Para quem é */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"1.4rem", color:"#e8b84b", marginBottom:16 }}>{t("videochamada.for_you_h2")}</h2>
          {forYou.map((item) => (
            <div key={item} style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
              <span style={{ color:"#e8b84b", fontSize:20, flexShrink:0, marginTop:2 }} aria-hidden="true">✦</span>
              <span style={{ color:"#e2d9f3", fontSize:"1rem", lineHeight:1.6 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA principal */}
        <div style={{ background:"linear-gradient(135deg,#2a0055,#3b0764)", border:"2px solid rgba(232,184,75,0.6)", borderRadius:24, padding:"32px 24px", textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:14, color:"#9575cd", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{t("videochamada.cta_eyebrow")}</div>
          <div style={{ fontFamily:"Georgia, serif", fontSize:"2.2rem", color:"#e8b84b", fontWeight:700, marginBottom:4 }}>R$ 497</div>
          <div style={{ color:"#c4b5fd", fontSize:"0.95rem", marginBottom:24 }}>{t("videochamada.cta_meta")}</div>
          <a href={CHECKOUT_URL}
            style={{ display:"block", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", fontWeight:700, fontSize:"1.2rem", padding:"18px 24px", borderRadius:16, textDecoration:"none", marginBottom:12, lineHeight:1.3 }}>
            {t("videochamada.cta_button")}
          </a>
          <p style={{ fontSize:"0.9rem", color:"#9575cd", margin:0 }}>{t("videochamada.payment_note")}</p>
        </div>

        {/* Urgência suave */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <p style={{ fontSize:"0.95rem", color:"#c4b5fd", lineHeight:1.7 }}>
            {t("videochamada.urgency_1")}<br/>
            <strong style={{ color:"#e8b84b" }}>{t("videochamada.urgency_2")}</strong>
          </p>
        </div>

        {/* FAQ rápido */}
        <div style={{ marginBottom:40 }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"1.3rem", color:"#e8b84b", marginBottom:16 }}>{t("videochamada.faq_h2")}</h2>
          {faqs.map(([q, a]) => (
            <div key={q} style={{ marginBottom:20, borderBottom:"1px solid rgba(196,181,253,0.12)", paddingBottom:20 }}>
              <div style={{ fontWeight:700, color:"#f5f0ff", fontSize:"1rem", marginBottom:8 }}><span aria-hidden="true">❓</span> {q}</div>
              <div style={{ color:"#c4b5fd", fontSize:"0.95rem", lineHeight:1.65 }}>{a}</div>
            </div>
          ))}
        </div>

        {/* CTA final */}
        <a href={CHECKOUT_URL}
          style={{ display:"block", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", fontWeight:700, fontSize:"1.15rem", padding:"18px 24px", borderRadius:16, textDecoration:"none", textAlign:"center" }}>
          {t("videochamada.cta_final")}
        </a>

      </div>
    </div>
  );
}
