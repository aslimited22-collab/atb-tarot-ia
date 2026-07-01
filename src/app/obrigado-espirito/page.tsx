import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ObrigadoEspiritoClient from "./client";
import GoogleAdsPurchase from "@/components/GoogleAdsPurchase";

export const dynamic = "force-dynamic";

/**
 * Página pós-pagamento de Espírito Mentor (R$437).
 *
 * Webhook Kiwify envia email com link `?order={kiwify_order_id}` OU `?email={...}`.
 *
 * 3 estados:
 *  - `logged-purchased`: já logado + tem compra → CTA pra /dashboard/espirito-mentor
 *  - `account-exists`: não logado, email tem conta → form login
 *  - `needs-signup`: sem conta → form signup (cria + linka purchase via /api/auth/signup)
 */
export default async function ObrigadoEspiritoPage({
  searchParams,
}: {
  searchParams?: { email?: string; order?: string; order_id?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let customerEmail = (searchParams?.email || "").toLowerCase().trim();
  const orderRef = (searchParams?.order || searchParams?.order_id || "").trim();

  // Se veio orderId Kiwify, busca purchase pra resolver email
  if (orderRef && !customerEmail) {
    const admin = createAdminClient();
    const { data: purchase } = await admin
      .from("purchases")
      .select("email")
      .eq("kiwify_order_id", orderRef)
      .eq("plan", "espirito")
      .maybeSingle();
    if (purchase?.email) {
      customerEmail = purchase.email.toLowerCase();
    }
  }

  // Conversão "Compra" do Google Ads (Espírito R$437; dedupe via orderRef)
  const gadsPurchase = (
    <GoogleAdsPurchase value={437} orderId={orderRef || undefined} email={customerEmail || undefined} />
  );

  // Já logado?
  if (user) {
    return <>{gadsPurchase}<ObrigadoEspiritoClient mode="logged-purchased" email={(user.email || "").toLowerCase()} /></>;
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
      return <>{gadsPurchase}<ObrigadoEspiritoClient mode="account-exists" email={customerEmail} /></>;
    }
  }

  return <>{gadsPurchase}<ObrigadoEspiritoClient mode="needs-signup" email={customerEmail} /></>;
}
