import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LimpezaClient from "./client";

export const dynamic = "force-dynamic";

export default async function LimpezaPage({
  searchParams,
}: {
  searchParams?: { just_purchased?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = (user!.email || "").toLowerCase();

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("email", userEmail)
    // Aceita as 3 variantes do produto Limpeza (V1, V2 BR, V2 intl) — antes só
    // checava "limpeza", o que bloqueava quem comprou pelo funil V2 no dashboard.
    .in("plan", ["limpeza", "limpeza_v2", "limpeza_v2_intl"])
    .neq("event", "order.refunded")
    .neq("event", "order_refunded")
    .limit(1)
    .maybeSingle();

  const purchased = !!purchase;
  const justPurchased = searchParams?.just_purchased === "1";

  // Histórico de limpezas pagas (orders v2 com leituras geradas)
  // Usa admin client porque RLS de orders permite ler só do próprio email
  // mas algumas orders antigas podem não ter user_id; busca por email.
  const admin = createAdminClient();
  const { data: pastOrders } = await admin
    .from("orders")
    .select("id, created_at")
    .eq("email", userEmail)
    .eq("product_type", "limpeza_espiritual")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(20);
  const pastLimpezas = (pastOrders || []).map((o) => ({
    id: o.id,
    createdAt: o.created_at,
  }));

  const { data: profile } = await supabase
    .from("users").select("name, email").eq("id", user!.id).maybeSingle();
  const firstName = (profile?.name || profile?.email?.split("@")[0] || "querida").split(" ")[0];

  let messages: Array<{ id: string; role: string; content: string }> = [];
  let remaining = 3;
  let limpezaProfile: {
    full_name: string | null;
    age: number | null;
    marital_status: string | null;
    main_feeling: string | null;
    situation: string | null;
  } | null = null;

  if (purchased) {
    const { data } = await supabase
      .from("limpeza_messages")
      .select("id, role, content, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true })
      .limit(50);
    messages = data || [];
    const userCount = messages.filter((m) => m.role === "user").length;
    remaining = Math.max(0, 3 - userCount);

    const { data: profileData } = await supabase
      .from("limpeza_profile")
      .select("full_name, age, marital_status, main_feeling, situation")
      .eq("user_id", user!.id)
      .maybeSingle();
    limpezaProfile = profileData;
  }

  const kiwifyUrl = process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL || "#";

  return (
    <LimpezaClient
      purchased={purchased}
      justPurchased={justPurchased}
      firstName={firstName}
      kiwifyUrl={kiwifyUrl}
      initialMessages={messages}
      initialRemaining={remaining}
      hasProfile={!!limpezaProfile?.full_name}
      pastLimpezas={pastLimpezas}
    />
  );
}
