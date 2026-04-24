"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/types";

const LINKS = [
  { href: "/dashboard",            label: "Início",               icon: "🏠", min: "free"    as Plan },
  { href: "/dashboard/chat",       label: "Conversar com ATB",    icon: "💬", min: "free"    as Plan },
  { href: "/dashboard/oracle",     label: "Carta do Dia",         icon: "🔮", min: "free"    as Plan },
  { href: "/dashboard/journal",    label: "Meu Diário",           icon: "📖", min: "basic"   as Plan },
  { href: "/dashboard/addiction",  label: "Guia Espiritual",      icon: "🕯️", min: "premium" as Plan },
];
const ORDER: Record<Plan,number> = { free:0, basic:1, premium:2 };
const PLAN_LABEL: Record<Plan,string> = { free:"Grátis", basic:"Básico", premium:"Premium" };
const SIDE_BG = "#1a0035";
const SEP = "rgba(196,181,253,0.15)";
const VIDEO_URL = process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL || "#";

export function Sidebar({ email, plan }: { email: string; plan: Plan }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  const initial = (email[0] || "?").toUpperCase();

  const nav = (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Avatar */}
      <div style={{ padding:"22px 18px", borderBottom:`1px solid ${SEP}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:22, flexShrink:0 }}>{initial}</div>
          <div style={{ overflow:"hidden" }}>
            <div style={{ fontSize:14, color:"#c4b5fd", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{email}</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#e8b84b", marginTop:3 }}>{PLAN_LABEL[plan]}</div>
          </div>
        </div>
      </div>

      {/* Links */}
      <nav style={{ flex:1, paddingTop:8 }}>
        {LINKS.map((l) => {
          const locked = ORDER[plan] < ORDER[l.min];
          const active = pathname === l.href;
          return (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"16px 18px",
              background: active ? "rgba(232,184,75,0.12)" : "transparent",
              borderLeft: active ? "4px solid #e8b84b" : "4px solid transparent",
              color: active ? "#f5f0ff" : "#c4b5fd",
              fontWeight: active ? 700 : 400,
              fontSize: 17,
              textDecoration:"none",
              minHeight: 56,
            }}>
              <span style={{ fontSize:24 }}>{l.icon}</span>
              <span style={{ flex:1 }}>{l.label}</span>
              {locked && <span style={{ fontSize:12, fontWeight:600, background:"rgba(232,184,75,0.15)", color:"#e8b84b", border:"1px solid rgba(232,184,75,0.4)", borderRadius:20, padding:"3px 10px" }}>{l.min==="premium"?"Premium":"Básico"}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Upsell vídeo chamada */}
      <div style={{ padding:"16px", borderTop:`1px solid ${SEP}` }}>
        <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer"
          style={{ display:"block", background:"linear-gradient(135deg,#3b0764,#2a0055)", border:"1.5px solid rgba(232,184,75,0.5)", borderRadius:16, padding:"16px", textDecoration:"none", textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:6 }}>📞</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#e8b84b", marginBottom:4, lineHeight:1.4 }}>Vídeo Chamada com ATB</div>
          <div style={{ fontSize:13, color:"#c4b5fd", marginBottom:10, lineHeight:1.5 }}>Sessão ao vivo pelo WhatsApp, só para você</div>
          <div style={{ background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", fontWeight:700, fontSize:14, padding:"10px", borderRadius:10 }}>Agendar minha sessão — R$877</div>
        </a>
      </div>

      {/* Logout */}
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${SEP}` }}>
        <button onClick={logout} style={{ width:"100%", padding:"14px", borderRadius:14, border:`1.5px solid ${SEP}`, background:"transparent", color:"#c4b5fd", fontSize:17, fontWeight:500, cursor:"pointer", minHeight:52 }}>
          Sair da conta
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside style={{ width:280, minHeight:"100vh", background:SIDE_BG, borderRight:`1px solid ${SEP}`, position:"sticky", top:0, display:"none" }} className="md:block">
        <div style={{ padding:"20px 18px", borderBottom:`1px solid ${SEP}` }}>
          <span className="serif" style={{ fontSize:"1.6rem", color:"#e8b84b" }}>ATB Tarot ✨</span>
        </div>
        {nav}
      </aside>

      {/* Mobile bar */}
      <div className="md:hidden sticky top-0 z-30" style={{ background:SIDE_BG, borderBottom:`1px solid ${SEP}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px" }}>
        <button onClick={() => setOpen(!open)} style={{ fontSize:30, background:"none", border:"none", cursor:"pointer", color:"#c4b5fd", padding:"4px 8px" }}>☰</button>
        <span className="serif" style={{ fontSize:"1.3rem", color:"#e8b84b" }}>ATB Tarot ✨</span>
        <div style={{ width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:18 }}>{initial}</div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.65)" }} onClick={() => setOpen(false)}>
          <div style={{ width:300, height:"100%", background:SIDE_BG, display:"flex", flexDirection:"column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding:"18px", borderBottom:`1px solid ${SEP}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span className="serif" style={{ fontSize:"1.3rem", color:"#e8b84b" }}>ATB Tarot ✨</span>
              <button onClick={() => setOpen(false)} style={{ fontSize:26, background:"none", border:"none", cursor:"pointer", color:"#c4b5fd", padding:"4px 8px" }}>✕</button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
