import Link from "next/link";

const CHECKOUT_URL = process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL || "#";

export default function VideoChamadaPage() {
  return (
    <div style={{ minHeight:"100vh", background:"radial-gradient(ellipse at 30% 0%, #3b0764 0%, #120025 70%)", color:"#f5f0ff", fontFamily:"'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ textAlign:"center", padding:"40px 20px 0" }}>
        <Link href="/" style={{ textDecoration:"none" }}>
          <span style={{ fontFamily:"Georgia, serif", fontSize:"1.5rem", color:"#e8b84b" }}>ATB Tarot ✨</span>
        </Link>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"32px 20px 60px" }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🔮</div>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"clamp(2rem, 5vw, 2.8rem)", color:"#f5f0ff", lineHeight:1.25, marginBottom:16 }}>
            Imagine sentar comigo<br/>
            <span style={{ color:"#e8b84b" }}>e ouvir tudo o que as cartas<br/>têm a dizer sobre a sua vida</span>
          </h1>
          <p style={{ fontSize:"1.15rem", color:"#c4b5fd", lineHeight:1.75, maxWidth:520, margin:"0 auto" }}>
            Não uma resposta rápida. Não um texto na tela.<br/>
            Uma sessão inteira, só sua, ao vivo — onde você me conta o que está pesando no coração e eu levo isso para as cartas, sem pressa.
          </p>
        </div>

        {/* O que é */}
        <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(196,181,253,0.2)", borderRadius:20, padding:"28px 24px", marginBottom:24 }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"1.5rem", color:"#e8b84b", marginBottom:20 }}>O que acontece na sua sessão</h2>
          {[
            ["💬", "Você me conta o que está vivendo", "Relacionamento, trabalho, saúde, família — o que estiver no seu coração. Sem julgamento."],
            ["🃏", "Eu faço a sua leitura ao vivo", "Tiro as cartas para você na hora, explico cada uma com calma e clareza, do jeito que você merece entender."],
            ["🗺️", "Você sai com um caminho", "Não só previsões — você recebe orientações práticas e espirituais para os seus próximos passos."],
            ["📞", "Tudo pelo WhatsApp, no conforto da sua casa", "Sem precisar sair, sem complicação de tecnologia. É simples como uma ligação de vídeo com uma amiga."],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display:"flex", gap:16, marginBottom:20 }}>
              <div style={{ fontSize:28, flexShrink:0, marginTop:2 }}>{icon}</div>
              <div>
                <div style={{ fontWeight:700, color:"#f5f0ff", fontSize:"1.05rem", marginBottom:4 }}>{title}</div>
                <div style={{ color:"#c4b5fd", fontSize:"0.95rem", lineHeight:1.65 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Depoimento / prova social */}
        <div style={{ background:"linear-gradient(135deg,#2a0055,#1e0040)", border:"1.5px solid rgba(232,184,75,0.3)", borderRadius:20, padding:"24px", marginBottom:24, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>💛</div>
          <p style={{ fontFamily:"Georgia, serif", fontSize:"1.2rem", color:"#f5f0ff", lineHeight:1.7, fontStyle:"italic", marginBottom:16 }}>
            "Eu nunca tinha feito uma leitura de tarot antes. Tinha medo de ouvir coisas ruins. Mas a ATB me recebeu com tanta delicadeza... Chorei, mas foi um choro de alívio. Finalmente alguém que entendeu o que eu estava sentindo."
          </p>
          <div style={{ color:"#e8b84b", fontWeight:700, fontSize:"0.95rem" }}>— Maria, 58 anos, São Paulo</div>
        </div>

        {/* Para quem é */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"1.4rem", color:"#e8b84b", marginBottom:16 }}>Esta sessão é para você se...</h2>
          {[
            "Você sente que está num momento de virada e precisa de clareza",
            "Tem dúvidas sobre relacionamento, família ou seu próximo passo na vida",
            "Quer ser ouvida de verdade, sem pressa, por alguém que realmente vê você",
            "Nunca fez uma leitura ao vivo e quer uma experiência segura e acolhedora",
            "Sente que as respostas estão perto, mas ainda não consegue enxergá-las",
          ].map((item) => (
            <div key={item} style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
              <span style={{ color:"#e8b84b", fontSize:20, flexShrink:0, marginTop:2 }}>✦</span>
              <span style={{ color:"#e2d9f3", fontSize:"1rem", lineHeight:1.6 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA principal */}
        <div style={{ background:"linear-gradient(135deg,#2a0055,#3b0764)", border:"2px solid rgba(232,184,75,0.6)", borderRadius:24, padding:"32px 24px", textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:14, color:"#9575cd", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Vídeo Chamada Exclusiva</div>
          <div style={{ fontFamily:"Georgia, serif", fontSize:"2.2rem", color:"#e8b84b", fontWeight:700, marginBottom:4 }}>R$ 877</div>
          <div style={{ color:"#c4b5fd", fontSize:"0.95rem", marginBottom:24 }}>Sessão única · Via WhatsApp · Agendamento flexível</div>
          <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer"
            style={{ display:"block", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", fontWeight:700, fontSize:"1.2rem", padding:"18px 24px", borderRadius:16, textDecoration:"none", marginBottom:12, lineHeight:1.3 }}>
            Quero agendar minha sessão com ATB →
          </a>
          <p style={{ fontSize:"0.9rem", color:"#9575cd", margin:0 }}>🔒 Pagamento 100% seguro · Cartão ou Pix</p>
        </div>

        {/* Urgência suave */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <p style={{ fontSize:"0.95rem", color:"#c4b5fd", lineHeight:1.7 }}>
            As vagas são limitadas porque cada sessão recebe minha atenção completa.<br/>
            <strong style={{ color:"#e8b84b" }}>Quando as vagas desta semana acabam, você entra em lista de espera.</strong>
          </p>
        </div>

        {/* FAQ rápido */}
        <div style={{ marginBottom:40 }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"1.3rem", color:"#e8b84b", marginBottom:16 }}>Perguntas frequentes</h2>
          {[
            ["Como funciona?", "Após o pagamento, você recebe um link para escolher o dia e horário. A sessão acontece por vídeo chamada no WhatsApp, dura aproximadamente 1 hora."],
            ["Nunca usei tarot. Posso fazer?", "Pode sim! Na verdade, muitas clientes que mais aproveitam são aquelas que chegam pela primeira vez. Eu cuido de tudo com cuidado e sem pressa."],
            ["E se eu precisar cancelar?", "Sem problema. Você pode remarcar a sessão com até 24h de antecedência."],
          ].map(([q, a]) => (
            <div key={q} style={{ marginBottom:20, borderBottom:"1px solid rgba(196,181,253,0.12)", paddingBottom:20 }}>
              <div style={{ fontWeight:700, color:"#f5f0ff", fontSize:"1rem", marginBottom:8 }}>❓ {q}</div>
              <div style={{ color:"#c4b5fd", fontSize:"0.95rem", lineHeight:1.65 }}>{a}</div>
            </div>
          ))}
        </div>

        {/* CTA final */}
        <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer"
          style={{ display:"block", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", fontWeight:700, fontSize:"1.15rem", padding:"18px 24px", borderRadius:16, textDecoration:"none", textAlign:"center" }}>
          Sim, quero minha sessão de Vídeo Chamada com ATB →
        </a>

      </div>
    </div>
  );
}
