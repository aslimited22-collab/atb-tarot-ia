import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileChatCredits } from "@/lib/reconcileCredits";
import { Sidebar } from "@/components/Sidebar";
import OnboardingTour from "@/components/OnboardingTour";
import type { Plan } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Reconcilia créditos de pergunta avulsa em QUALQUER entrada autenticada do
  // dashboard — não só no chat. Garante que quem pagou e logou (por qualquer
  // caminho: magic-link, senha, recovery) já tenha o saldo aplicado, sem
  // depender de abrir o chat. Idempotente; falha-soft pra não quebrar o layout.
  try {
    const admin = createAdminClient();
    await reconcileChatCredits(admin, user.id, user.email || "");
  } catch {}

  const { data: profile } = await supabase
    .from("users").select("plan, email").eq("id", user.id).maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";
  const email = profile?.email || user.email || "";

  return (
    <div className="min-h-screen md:flex" style={{ background: "#120025" }}>
      <Sidebar email={email} plan={plan} />
      <div className="flex-1 min-w-0">{children}</div>
      {/* Tour da primeira visita — mostra apenas se localStorage onboarding_done ≠ '1' */}
      <OnboardingTour />
    </div>
  );
}
