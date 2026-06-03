import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileChatCredits } from "@/lib/reconcileCredits";
import { getServerLocale } from "@/lib/i18n/server";
import { Sidebar } from "@/components/Sidebar";
import OnboardingTour from "@/components/OnboardingTour";
import type { Plan } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("plan, email, locale").eq("id", user.id).maybeSingle();

  // Pós-login em QUALQUER página do dashboard:
  //  1) Reconcilia créditos de pergunta avulsa (não depende de abrir o chat).
  //  2) Captura o IDIOMA REAL do cliente (geo/escolha) no registro. Antes todos
  //     ficavam 'pt' e estrangeiro recebia e-mail/resgate em português. Atualiza
  //     só quando difere. Tudo idempotente e falha-soft pra não quebrar o layout.
  try {
    const admin = createAdminClient();
    await reconcileChatCredits(admin, user.id, user.email || "");
    const detected = getServerLocale();
    if (profile && (profile as { locale?: string }).locale !== detected) {
      await admin.from("users").update({ locale: detected }).eq("id", user.id);
    }
  } catch {}

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
