import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanBadge } from "@/components/PlanBadge";
import { MESSAGE_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/types";

const quick = [
  { href: "/dashboard/chat", icon: "💬", title: "Chat com ATB", desc: "Converse com sua tarologa IA." },
  { href: "/dashboard/oracle", icon: "🔮", title: "Oráculo Diário", desc: "Sua carta do dia." },
  { href: "/dashboard/journal", icon: "📖", title: "Diário da Ansiedade", desc: "Registre seus sentimentos." },
  { href: "/dashboard/addiction", icon: "🕯️", title: "Guia de Vícios", desc: "Rompa padrões espirituais." },
];

export default async function DashboardHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("users")
    .select("plan, email, messages_today, last_message_date")
    .eq("id", user!.id)
    .maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";
  const today = new Date().toISOString().slice(0, 10);
  const used = profile?.last_message_date === today ? profile?.messages_today ?? 0 : 0;
  const limit = MESSAGE_LIMITS[plan];
  const remaining = limit === Infinity ? "∞" : Math.max(0, limit - used);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="serif text-3xl md:text-4xl gold mb-2">Bem-vindo(a)</h1>
        <p className="text-white/70">{profile?.email || user?.email}</p>
      </div>

      <div className="card p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-sm text-white/60 mb-1">Seu plano atual</div>
          <PlanBadge plan={plan} />
        </div>
        {plan !== "premium" && (
          <Link href="/#planos" className="btn-gold text-sm">Fazer Upgrade</Link>
        )}
      </div>

      <div className="card p-6 mb-8">
        <div className="text-sm text-white/60 mb-1">Mensagens restantes hoje</div>
        <div className="serif text-4xl gold">{remaining}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className="card p-5 hover:bg-white/5 transition">
            <div className="text-3xl mb-2">{q.icon}</div>
            <h3 className="serif text-xl gold mb-1">{q.title}</h3>
            <p className="text-sm text-white/70">{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
