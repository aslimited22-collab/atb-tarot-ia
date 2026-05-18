import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ObrigadoPerguntaClient from "./client";

export const dynamic = "force-dynamic";

/**
 * Página pós-pagamento de "pergunta avulsa" (R$14,90 / R$19,90 / R$39,90).
 *
 * Cliente paga via Kiwify (success_url) ou Stripe (success_url),
 * cai aqui com `?order={kiwify_order_id}` OU `?session_id={stripe_session_id}` OU `?email={...}`.
 *
 * 3 estados possíveis:
 *  - `logged-with-credits`: já tem conta + créditos creditados → CTA pra /dashboard/chat
 *  - `account-exists`: não logado, email tem conta → form login
 *  - `needs-signup`: não logado, sem conta → form signup (cria conta + concede créditos das purchases pendentes)
 */
export default async function ObrigadoPerguntaPage({
  searchParams,
}: {
  searchParams?: { email?: string; order?: string; order_id?: string; session_id?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Email pode vir direto (?email=) ou via lookup de purchase
  let customerEmail = (searchParams?.email || "").toLowerCase().trim();

  // Se veio orderId Kiwify, busca purchase
  const orderRef = (searchParams?.order || searchParams?.order_id || searchParams?.session_id || "").trim();
  if (orderRef && !customerEmail) {
    const admin = createAdminClient();
    const { data: purchase } = await admin
      .from("purchases")
      .select("email")
      .eq("kiwify_order_id", orderRef)
      .in("plan", ["pergunta1", "pergunta3", "pergunta7"])
      .maybeSingle();
    if (purchase?.email) {
      customerEmail = purchase.email.toLowerCase();
    }
  }

  // Cliente já logado?
  if (user) {
    return <ObrigadoPerguntaClient mode="logged-with-credits" email={(user.email || "").toLowerCase()} />;
  }

  // Não logado — checa se já tem conta
  if (customerEmail) {
    const admin = createAdminClient();
    const { data: existingUser } = await admin
      .from("users")
      .select("id, email")
      .eq("email", customerEmail)
      .maybeSingle();

    if (existingUser) {
      return <ObrigadoPerguntaClient mode="account-exists" email={customerEmail} />;
    }
  }

  // Sem conta — precisa criar
  return <ObrigadoPerguntaClient mode="needs-signup" email={customerEmail} />;
}
