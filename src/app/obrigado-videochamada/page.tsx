import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";
import GoogleAdsPurchase from "@/components/GoogleAdsPurchase";

export default function ObrigadoVideoChamadaPage({
  searchParams,
}: {
  searchParams?: { email?: string; order?: string; order_id?: string };
}) {
  const { t } = getServerT();
  const orderRef = (searchParams?.order || searchParams?.order_id || "").trim();
  const customerEmail = (searchParams?.email || "").toLowerCase().trim();

  const nextSteps: Array<[string, string, string]> = [
    ["📱", t("videochamada_obrigado.step1_title"), t("videochamada_obrigado.step1_desc")],
    ["📅", t("videochamada_obrigado.step2_title"), t("videochamada_obrigado.step2_desc")],
    ["🔮", t("videochamada_obrigado.step3_title"), t("videochamada_obrigado.step3_desc")],
  ];

  return (
    <div style={{ minHeight:"100vh", background:"radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", color:"#f5f0ff", fontFamily:"'Inter', sans-serif", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      {/* Conversão "Compra" do Google Ads (Sessão ao Vivo R$877) */}
      <GoogleAdsPurchase value={877} orderId={orderRef || undefined} email={customerEmail || undefined} />

      <div style={{ maxWidth:620, width:"100%", textAlign:"center", padding:"40px 24px" }}>

        {/* Ícone celebratório */}
        <div style={{ fontSize:80, marginBottom:16, animation:"pulse 2s infinite" }} aria-hidden="true">💛</div>

        {/* Selo de confirmação */}
        <div style={{ display:"inline-block", background:"rgba(232,184,75,0.15)", border:"1.5px solid rgba(232,184,75,0.5)", borderRadius:100, padding:"8px 20px", fontSize:"0.85rem", fontWeight:700, color:"#e8b84b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:24 }}>
          {t("videochamada_obrigado.payment_confirmed")}
        </div>

        {/* Título */}
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(2rem, 6vw, 2.8rem)", color:"#f5f0ff", lineHeight:1.2, marginBottom:24 }}>
          {t("videochamada_obrigado.h1_line1")}<br/>
          <span style={{ color:"#e8b84b" }}>{t("videochamada_obrigado.h1_line2")}</span>
        </h1>

        {/* Mensagem principal */}
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(196,181,253,0.25)", borderRadius:20, padding:"32px 24px", marginBottom:24, textAlign:"left" }}>
          <p style={{ fontSize:"1.15rem", color:"#f5f0ff", lineHeight:1.75, marginBottom:20 }}>
            <strong style={{ color:"#e8b84b" }}>{t("videochamada_obrigado.greeting")}</strong>
          </p>
          <p style={{ fontSize:"1.05rem", color:"#e2d9f3", lineHeight:1.8, marginBottom:20 }}>
            {t("videochamada_obrigado.p1")}
          </p>
          <p style={{ fontSize:"1.05rem", color:"#e2d9f3", lineHeight:1.8, marginBottom:20 }}>
            <strong style={{ color:"#f5f0ff" }}>{t("videochamada_obrigado.p2_pre")}</strong>{" "}{t("videochamada_obrigado.p2_rest")}
          </p>
          <p style={{ fontSize:"1.05rem", color:"#e2d9f3", lineHeight:1.8, marginBottom:0 }}>
            {t("videochamada_obrigado.p3")}
          </p>
        </div>

        {/* Próximos passos */}
        <div style={{ background:"linear-gradient(135deg,#2a0055,#1e0040)", border:"1.5px solid rgba(232,184,75,0.3)", borderRadius:20, padding:"24px", marginBottom:24, textAlign:"left" }}>
          <div style={{ fontSize:"0.85rem", color:"#9575cd", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:14, fontWeight:700 }}>
            {t("videochamada_obrigado.next_steps_eyebrow")}
          </div>

          {nextSteps.map(([icon, title, desc], i) => (
            <div key={i} style={{ display:"flex", gap:14, marginBottom: i < nextSteps.length - 1 ? 18 : 0 }}>
              <div style={{ fontSize:26, flexShrink:0, marginTop:2 }} aria-hidden="true">{icon}</div>
              <div>
                <div style={{ fontWeight:700, color:"#f5f0ff", fontSize:"1rem", marginBottom:4 }}>{title}</div>
                <div style={{ color:"#c4b5fd", fontSize:"0.95rem", lineHeight:1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Assinatura */}
        <div style={{ fontFamily:"Georgia, serif", fontSize:"1.15rem", color:"#e8b84b", fontStyle:"italic", marginBottom:32 }}>
          {t("videochamada_obrigado.signature_pre")}<br/>
          <strong style={{ fontSize:"1.35rem" }}>ATB ✨</strong>
        </div>

        {/* Botão voltar */}
        <Link href="/dashboard" style={{ display:"inline-block", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(196,181,253,0.25)", borderRadius:14, padding:"14px 28px", color:"#c4b5fd", textDecoration:"none", fontSize:"1rem", fontWeight:600 }}>
          {t("videochamada_obrigado.back_button")}
        </Link>

        {/* Suporte */}
        <p style={{ fontSize:"0.9rem", color:"#9575cd", marginTop:32, lineHeight:1.6 }}>
          {t("videochamada_obrigado.support_line1")}<br/>
          {t("videochamada_obrigado.support_line2")}
        </p>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}} />
    </div>
  );
}
