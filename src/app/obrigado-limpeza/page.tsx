import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ObrigadoLimpezaClient from "./client";
import GoogleAdsPurchase from "@/components/GoogleAdsPurchase";

export const dynamic = "force-dynamic";

export default async function ObrigadoLimpezaPage({
  searchParams,
}: {
  searchParams?: { email?: string; order_id?: string; order?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Preferimos `order_id` (UUID, não-PII) — evita expor email em browser history/referer.
  // `?email=` mantido como fallback pra links legados.
  const orderIdRaw = (searchParams?.order || searchParams?.order_id || "").trim();
  const orderIdValid = /^[0-9a-f-]{36}$/i.test(orderIdRaw) ? orderIdRaw : "";

  let customerEmail = (searchParams?.email || "").toLowerCase().trim();

  // Se veio order_id, resolve email server-side (não expõe na URL)
  if (orderIdValid && !customerEmail) {
    const adminLookup = createAdminClient();
    const { data: order } = await adminLookup
      .from("orders")
      .select("email")
      .eq("id", orderIdValid)
      .maybeSingle();
    if (order?.email) {
      customerEmail = order.email.toLowerCase();
    }
  }

  // Conversão "Compra" do Google Ads (dedupe via orderId; email = conversões aprimoradas)
  const gadsPurchase = (
    <GoogleAdsPurchase value={100} orderId={orderIdValid || undefined} email={customerEmail || undefined} />
  );

  // Já está logado?
  if (user) {
    // Se logado E tem compra de limpeza, vai direto para a sessão
    const userEmail = (user.email || "").toLowerCase();
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("email", userEmail)
      .in("plan", ["limpeza", "limpeza_v2", "limpeza_v2_intl"])
      .neq("event", "order.refunded")
      .neq("event", "order_refunded")
      .limit(1)
      .maybeSingle();

    if (purchase) {
      return <>{gadsPurchase}<ObrigadoLimpezaClient mode="logged-purchased" email={userEmail} orderId={orderIdValid} /></>;
    }

    // Logado mas sem compra registrada ainda — webhook pode estar atrasado
    return <>{gadsPurchase}<ObrigadoLimpezaClient mode="logged-waiting" email={userEmail} orderId={orderIdValid} /></>;
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
      return <>{gadsPurchase}<ObrigadoLimpezaClient mode="account-exists" email={customerEmail} orderId={orderIdValid} /></>;
    }
  }

  // Não logado, sem conta — pede pra criar conta
  return <>{gadsPurchase}<ObrigadoLimpezaClient mode="needs-signup" email={customerEmail} orderId={orderIdValid} /></>;
}
