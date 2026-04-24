"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/types";

const LINKS = [
  { href: "/dashboard",            label: "Dashboard",           icon: "🏠", min: "free"    as Plan },
  { href: "/dashboard/chat",       label: "Chat com ATB",        icon: "💬", min: "free"    as Plan },
  { href: "/dashboard/oracle",     label: "Oráculo Diário",      icon: "🔮", min: "free"    as Plan },
  { href: "/dashboard/journal",    label: "Diário da Ansiedade", icon: "📖", min: "basic"   as Plan },
  { href: "/dashboard/addiction",  label: "Guia de Vícios",      icon: "🕯️", min: "premium" as Plan },
];
const ORDER: Record<Plan,number> = { free:0, basic:1, premium:2 };
const PLAN_LABEL: Record<Plan,string> = { free:"Grátis", basic:"Basic", premium:"Premium" };
const SIDE_BG = "#1a0035";
const SEP = "rgba(196,181,253,0.15)";

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
      <div style={{ padding:"20px 16px", borderBottom:`1px solid ${SEP}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:18, flexShrink:0 }}>{initial}</div>
          <div style={{ overflow:"hidden" }}>
            <div style={{ fontSize:13, color:"#c4b5fd", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{email}</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#e8b84b", marginTop:2 }}>{PLAN_LABEL[plan]}</div>
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
              display:"flex", alignItems:"center", gap:12,
              padding:"14px 16px",
              background: active ? "rgba(232,184,75,0.12)" : "transparent",
              borderLeft: active ? "3px solid #e8b84b" : "3px solid transparent",
              color: active ? "#f5f0ff" : "#c4b5fd",
              fontWeight: active ? 700 : 400,
              fontSize:16,
              textDecoration:"none",
            }}>
              <span style={{ fontSize:22 }}>{l.icon}</span>
              <span style={{ flex:1 }}>{l.label}</span>
              {locked && <span style={{ fontSize:11, fontWeight:600, background:"rgba(232,184,75,0.15)", color:"#e8b84b", border:"1px solid rgba(232,184,75,0.4)", borderRadius:20, padding:"2px 8px" }}>{l.min==="premium"?"Premium":"Basic"}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${SEP}` }}>
        <button onClick={logout} style={{ width:"100%", padding:"12px", borderRadius:12, border:`1.5px solid ${SEP}`, background:"transparent", color:"#c4b5fd", fontSize:16, fontWeight:500, cursor:"pointer" }}>
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside style={{ width:260, minHeight:"100vh", background:SIDE_BG, borderRight:`1px solid ${SEP}`, position:"sticky", top:0, display:"none" }} className="md:block">
        <div style={{ padding:"18px 16px", borderBottom:`1px solid ${SEP}` }}>
          <span className="serif text-2xl" style={{ color:"#e8b84b" }}>ATB Tarot</span>
        </div>
        {nav}
      </aside>

      {/* Mobile bar */}
      <div className="md:hidden sticky top-0 z-30" style={{ background:SIDE_BG, borderBottom:`1px solid ${SEP}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px" }}>
        <button onClick={() => setOpen(!open)} style={{ fontSize:26, background:"none", border:"none", cursor:"pointer", color:"#c4b5fd" }}>☰</button>
        <span className="serif text-xl" style={{ color:"#e8b84b" }}>ATB Tarot</span>
        <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#e8b84b,#c9950a)", color:"#120025", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:15 }}>{initial}</div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" style={{ background:"rgba(0,0,0,0.65)" }} onClick={() => setOpen(false)}>
          <div style={{ width:280, height:"100%", background:SIDE_BG, display:"flex", flexDirection:"column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding:"16px", borderBottom:`1px solid ${SEP}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span className="serif text-xl" style={{ color:"#e8b84b" }}>ATB Tarot</span>
              <button onClick={() => setOpen(false)} style={{ fontSize:22, background:"none", border:"none", cursor:"pointer", color:"#c4b5fd" }}>✕</button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
