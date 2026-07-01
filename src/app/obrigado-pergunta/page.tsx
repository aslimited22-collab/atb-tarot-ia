import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ObrigadoPerguntaClient from "./client";
import GoogleAdsPurchase from "@/components/GoogleAdsPurchase";

export const dynamic = "force-dynamic";

/**
 * Página pós-pagamento de "pergunta avulsa" (R$14,90 / R$19,90 / R$39,90).
 *
 * Cliente paga via Kiwify (success_url) ou Stripe (success_url),
 * cai aqui com `?order={kiwify_order_id}` OU `?session_id={stripe_session_id}` OU `?email={...}`.
 *
 * 3 estados possíveis:
 *  - `logged-with-credits`: já tem conta + créditos creditados → CTA pra /dashboard/chat
 *  - `check-email`: cliente caiu aqui mas o email com magic-link foi enviado pelo webhook → mostra "Verifique seu email"
 *  - `account-exists`: não logado, email tem conta → magic-link primário + form login fallback
 *  - `needs-signup`: não logado, sem conta + sem email → fallback raro (signup manual)
 *
 * NOTA: o AutoCreate com senha auto-gerada foi removido. Senha que cliente nunca via
 * era o principal bloqueio pra 60+ que perdia sessão (refresh, mudou pra celular).
 * Agora o webhook Kiwify gera magic-link no welcome email — cliente entra em 1 toque.
 */
export default async function ObrigadoPerguntaPage({
  searchParams,
}: {
  searchParams?: { email?: string; order?: string; order_id?: string; session_id?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Email + nome podem vir do query ou via lookup de purchase
  let customerEmail = (searchParams?.email || "").toLowerCase().trim();
  let customerName = "";
  let purchaseConfirmed = false;

  const orderRef = (searchParams?.order || searchParams?.order_id || searchParams?.session_id || "").trim();
  if (orderRef) {
    const admin = createAdminClient();
    const { data: purchase } = await admin
      .from("purchases")
      .select("email, name")
      .eq("kiwify_order_id", orderRef)
      .in("plan", ["pergunta1", "pergunta3", "pergunta7"])
      .maybeSingle();
    if (purchase?.email && !customerEmail) customerEmail = purchase.email.toLowerCase();
    if (purchase?.name) customerName = purchase.name;
    purchaseConfirmed = !!purchase;
  }
  // Se temos email direto (sem orderRef), checa se purchase já está no DB
  else if (customerEmail) {
    const admin = createAdminClient();
    const { count } = await admin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("email", customerEmail)
      .in("plan", ["pergunta1", "pergunta3", "pergunta7"])
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
    purchaseConfirmed = (count ?? 0) > 0;
  }

  // Conversão "Compra" do Google Ads (pergunta avulsa R$29; dedupe via orderRef)
  const gadsPurchase = (
    <GoogleAdsPurchase value={29} orderId={orderRef || undefined} email={customerEmail || undefined} />
  );

  // Cliente já logado → redireciona direto pro chat (skip spinner — webhook irrelevante)
  if (user) {
    return <>{gadsPurchase}<ObrigadoPerguntaClient mode="logged-with-credits" email={(user.email || "").toLowerCase()} name={customerName} purchaseConfirmed={true} /></>;
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
      // Tem conta mas não logada — precisa de senha (LoginForm)
      return <>{gadsPurchase}<ObrigadoPerguntaClient mode="account-exists" email={customerEmail} name={customerName} purchaseConfirmed={purchaseConfirmed} /></>;
    }
  }

  // Sem conta + temos email da Kiwify → cliente vai entrar pelo magic-link do email.
  // Não criamos conta com senha aleatória aqui. Mostra tela "Verifique seu email".
  if (customerEmail) {
    return <>{gadsPurchase}<ObrigadoPerguntaClient mode="check-email" email={customerEmail} name={customerName} purchaseConfirmed={purchaseConfirmed} /></>;
  }

  // Sem email — fallback raro (cliente chegou aqui direto via URL sem params)
  return <>{gadsPurchase}<ObrigadoPerguntaClient mode="needs-signup" email={customerEmail} name={customerName} purchaseConfirmed={purchaseConfirmed} /></>;
}
