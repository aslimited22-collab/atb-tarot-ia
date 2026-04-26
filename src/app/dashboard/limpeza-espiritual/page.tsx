import { createClient } from "@/lib/supabase/server";
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
    .eq("plan", "limpeza")
    .neq("event", "order.refunded")
    .neq("event", "order_refunded")
    .limit(1)
    .maybeSingle();

  const purchased = !!purchase;
  const justPurchased = searchParams?.just_purchased === "1";

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
      hasProfile={!!limpezaProfile?.main_feeling}
    />
  );
}
