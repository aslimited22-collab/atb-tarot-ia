"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import type { Plan } from "@/lib/types";

const LINK_DEFS = [
  { href: "/dashboard",                    key: "side.home",         icon: "🏠", min: "free"    as Plan },
  { href: "/dashboard/chat",               key: "side.chat",         icon: "💬", min: "free"    as Plan },
  { href: "/dashboard/oracle",             key: "side.oracle",       icon: "🔮", min: "free"    as Plan },
  { href: "/dashboard/journal",            key: "side.journal",      icon: "📖", min: "basic"   as Plan },
  { href: "/dashboard/addiction",          key: "side.addiction",    icon: "🕯️", min: "premium" as Plan },
  { href: "/dashboard/numerologia",        key: "side.numerology",   icon: "🍀", min: "premium" as Plan },
  { href: "/dashboard/limpeza-espiritual", key: "side.limpeza",      icon: "🕊️", min: "free"    as Plan },
] as const;
const ORDER: Record<Plan,number> = { free:0, basic:1, premium:2 };
const PLAN_LABEL: Record<Plan,string> = { free:"Grátis", basic:"Básico", premium:"Premium" };
const SIDE_BG = "#1a0035";
const SEP = "rgba(196,181,253,0.15)";
const VIDEO_URL = process.env.NEXT_PUBLIC_KIWIFY_VIDEO_URL || "#";

export function Sidebar({ email, plan }: { email: string; plan: Plan }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  const initial = (email[0] || "?").toUpperCase();
  const LINKS = LINK_DEFS.map((l) => ({ ...l, label: t(l.key as any) }));

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

      {/* Links — texto e ícones grandes para 60+ */}
      <nav style={{ flex:1, paddingTop:8 }}>
        {LINKS.map((l) => {
          const locked = ORDER[plan] < ORDER[l.min];
          const active = pathname === l.href;
          return (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
              display:"flex", alignItems:"center", gap:16,
              padding:"18px 20px",
              background: active ? "rgba(232,184,75,0.18)" : "transparent",
              borderLeft: active ? "5px solid #e8b84b" : "5px solid transparent",
              color: active ? "#fbf8ff" : "#d9cdfc",
              fontWeight: active ? 700 : 600,
              fontSize: 18,
              textDecoration:"none",
              minHeight: 64,
              transition: "background .15s",
            }}>
              <span style={{ fontSize:28 }}>{l.icon}</span>
              <span style={{ flex:1 }}>{l.label}</span>
              {locked && <span style={{ fontSize:11, fontWeight:700, background:"rgba(232,184,75,0.2)", color:"#e8b84b", border:"1px solid rgba(232,184,75,0.5)", borderRadius:20, padding:"4px 10px", letterSpacing: "0.04em" }}>🔒 {l.min==="premium"?t("plan.premium").toUpperCase():t("plan.basic").toUpperCase()}</span>}
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
          <div style={{ background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", fontWeight:700, fontSize:14, padding:"10px", borderRadius:10 }}>Agendar — R$497</div>
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

      {/* Mobile bar — texto e botão grandes */}
      <div className="md:hidden sticky top-0 z-30" style={{ background:SIDE_BG, borderBottom:`1px solid ${SEP}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px" }}>
        <button
          onClick={() => setOpen(!open)}
          aria-label="Abrir menu"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            background: "rgba(232,184,75,0.15)",
            border: "1.5px solid rgba(232,184,75,0.4)",
            cursor: "pointer",
            color: "#e8b84b",
            padding: "10px 16px",
            borderRadius: 12,
            fontWeight: 700,
            minHeight: 48,
          }}
        >
          <span style={{ fontSize: 24 }}>☰</span>
          <span>Menu</span>
        </button>
        <span className="serif" style={{ fontSize: "1.4rem", color: "#e8b84b", fontWeight: 700 }}>ATB Tarot ✨</span>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#e8b84b,#c9950a)", color: "#120025", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20 }}>{initial}</div>
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
