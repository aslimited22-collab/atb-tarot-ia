import Link from "next/link";

export default function ObrigadoVideoChamadaPage() {
  return (
    <div style={{ minHeight:"100vh", background:"radial-gradient(ellipse at 50% 0%, #3b0764 0%, #120025 70%)", color:"#f5f0ff", fontFamily:"'Inter', sans-serif", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>

      <div style={{ maxWidth:620, width:"100%", textAlign:"center", padding:"40px 24px" }}>

        {/* Ícone celebratório */}
        <div style={{ fontSize:80, marginBottom:16, animation:"pulse 2s infinite" }}>💛</div>

        {/* Selo de confirmação */}
        <div style={{ display:"inline-block", background:"rgba(232,184,75,0.15)", border:"1.5px solid rgba(232,184,75,0.5)", borderRadius:100, padding:"8px 20px", fontSize:"0.85rem", fontWeight:700, color:"#e8b84b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:24 }}>
          ✓ Pagamento Confirmado
        </div>

        {/* Título */}
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(2rem, 6vw, 2.8rem)", color:"#f5f0ff", lineHeight:1.2, marginBottom:24 }}>
          Sua sessão com ATB<br/>
          <span style={{ color:"#e8b84b" }}>está reservada ✨</span>
        </h1>

        {/* Mensagem principal */}
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(196,181,253,0.25)", borderRadius:20, padding:"32px 24px", marginBottom:24, textAlign:"left" }}>
          <p style={{ fontSize:"1.15rem", color:"#f5f0ff", lineHeight:1.75, marginBottom:20 }}>
            <strong style={{ color:"#e8b84b" }}>Querida,</strong>
          </p>
          <p style={{ fontSize:"1.05rem", color:"#e2d9f3", lineHeight:1.8, marginBottom:20 }}>
            Obrigada por confiar em mim nesse momento da sua vida. Eu recebi sua reserva e já estou separando as cartas certas para a nossa conversa.
          </p>
          <p style={{ fontSize:"1.05rem", color:"#e2d9f3", lineHeight:1.8, marginBottom:20 }}>
            <strong style={{ color:"#f5f0ff" }}>Em até 24 horas</strong> eu vou entrar em contato com você pelo WhatsApp para combinarmos o melhor dia e horário da sua sessão ao vivo.
          </p>
          <p style={{ fontSize:"1.05rem", color:"#e2d9f3", lineHeight:1.8, marginBottom:0 }}>
            Enquanto isso, respire fundo. Suas respostas estão a caminho. 🔮
          </p>
        </div>

        {/* Próximos passos */}
        <div style={{ background:"linear-gradient(135deg,#2a0055,#1e0040)", border:"1.5px solid rgba(232,184,75,0.3)", borderRadius:20, padding:"24px", marginBottom:24, textAlign:"left" }}>
          <div style={{ fontSize:"0.85rem", color:"#9575cd", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:14, fontWeight:700 }}>
            O que acontece agora
          </div>

          {[
            ["📱", "Fique atenta ao WhatsApp", "Vou te chamar pelo mesmo número que você deixou no pagamento."],
            ["📅", "Vamos agendar juntas", "Escolheremos um dia e horário que seja bom para você — com calma, sem pressa."],
            ["🔮", "Sua sessão ao vivo", "No dia marcado, faremos uma videochamada pelo WhatsApp. Aproximadamente 1 hora só para você."],
          ].map(([icon, title, desc], i) => (
            <div key={i} style={{ display:"flex", gap:14, marginBottom: i < 2 ? 18 : 0 }}>
              <div style={{ fontSize:26, flexShrink:0, marginTop:2 }}>{icon}</div>
              <div>
                <div style={{ fontWeight:700, color:"#f5f0ff", fontSize:"1rem", marginBottom:4 }}>{title}</div>
                <div style={{ color:"#c4b5fd", fontSize:"0.95rem", lineHeight:1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Assinatura */}
        <div style={{ fontFamily:"Georgia, serif", fontSize:"1.15rem", color:"#e8b84b", fontStyle:"italic", marginBottom:32 }}>
          Com carinho,<br/>
          <strong style={{ fontSize:"1.35rem" }}>ATB ✨</strong>
        </div>

        {/* Botão voltar */}
        <Link href="/dashboard" style={{ display:"inline-block", background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(196,181,253,0.25)", borderRadius:14, padding:"14px 28px", color:"#c4b5fd", textDecoration:"none", fontSize:"1rem", fontWeight:600 }}>
          Voltar para o meu chat com ATB
        </Link>

        {/* Suporte */}
        <p style={{ fontSize:"0.9rem", color:"#9575cd", marginTop:32, lineHeight:1.6 }}>
          Tem alguma dúvida? Em caso de urgência, responda o e-mail de confirmação<br/>
          que você recebeu da Kiwify.
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
