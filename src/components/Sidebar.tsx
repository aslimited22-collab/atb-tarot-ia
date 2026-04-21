"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/types";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", min: "free" as Plan },
  { href: "/dashboard/chat", label: "Chat com ATB", icon: "💬", min: "free" as Plan },
  { href: "/dashboard/oracle", label: "Oráculo Diário", icon: "🔮", min: "free" as Plan },
  { href: "/dashboard/journal", label: "Diário da Ansiedade", icon: "📖", min: "basic" as Plan },
  { href: "/dashboard/addiction", label: "Guia de Vícios", icon: "🕯️", min: "premium" as Plan },
];

const ORDER: Record<Plan, number> = { free: 0, basic: 1, premium: 2 };

export function Sidebar({ email, plan }: { email: string; plan: Plan }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initial = (email[0] || "?").toUpperCase();

  const content = (
    <>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold text-[#1a0030] flex items-center justify-center font-bold">{initial}</div>
          <div className="truncate">
            <div className="text-xs text-white/60 truncate">{email}</div>
            <div className="text-xs gold capitalize">{plan}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4">
        {LINKS.map((l) => {
          const locked = ORDER[plan] < ORDER[l.min];
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition ${active ? "bg-purple/30 border-l-2 border-gold" : "hover:bg-white/5"}`}
            >
              <span>{l.icon}</span>
              <span className="flex-1">{l.label}</span>
              {locked && <span className="text-[10px] gold border border-gold px-1.5 py-0.5 rounded">{l.min === "premium" ? "Premium" : "Basic"}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <button onClick={logout} className="w-full btn-outline text-sm">Sair</button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#12001a] border-r border-white/10 sticky top-0">
        {content}
      </aside>
      <div className="md:hidden sticky top-0 z-30 bg-[#12001a] border-b border-white/10 flex items-center justify-between p-4">
        <button onClick={() => setOpen(!open)} className="text-2xl" aria-label="Menu">☰</button>
        <span className="serif text-lg gold">ATB Tarot</span>
        <div className="w-8 h-8 rounded-full bg-gold text-[#1a0030] flex items-center justify-center font-bold text-sm">{initial}</div>
      </div>
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setOpen(false)}>
          <div className="w-64 h-full bg-[#12001a] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
