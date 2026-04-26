import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ObrigadoLimpezaClient from "./client";

export const dynamic = "force-dynamic";

export default async function ObrigadoLimpezaPage({
  searchParams,
}: {
  searchParams?: { email?: string; order_id?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Email do cliente que comprou (vem do Kiwify via ?email=)
  const customerEmail = (searchParams?.email || "").toLowerCase().trim();

  // Já está logado?
  if (user) {
    // Se logado E tem compra de limpeza, vai direto para a sessão
    const userEmail = (user.email || "").toLowerCase();
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("email", userEmail)
      .eq("plan", "limpeza")
      .neq("event", "order.refunded")
      .neq("event", "order_refunded")
      .limit(1)
      .maybeSingle();

    if (purchase) {
      return <ObrigadoLimpezaClient mode="logged-purchased" email={userEmail} />;
    }

    // Logado mas sem compra registrada ainda — webhook pode estar atrasado
    return <ObrigadoLimpezaClient mode="logged-waiting" email={userEmail} />;
  }

  // Não logado — verifica se já existe conta com esse email
  if (customerEmail) {
    const adminClient = createAdminClient();
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id, email")
      .eq("email", customerEmail)
      .maybeSingle();

    if (existingUser) {
      // Já tem conta — manda fazer login
      return <ObrigadoLimpezaClient mode="account-exists" email={customerEmail} />;
    }
  }

  // Não logado, sem conta — pede pra criar conta
  return <ObrigadoLimpezaClient mode="needs-signup" email={customerEmail} />;
}
