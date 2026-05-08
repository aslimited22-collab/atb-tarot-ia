import { createClient } from "@/lib/supabase/server";
import EspiritoMentorClient from "./client";

export const dynamic = "force-dynamic";

export default async function EspiritoMentorPage({
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
    .eq("plan", "espirito")
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
  let espiritoProfile: {
    full_name: string | null;
    age: number | null;
    lost_loved_one: string | null;
    who_to_talk: string | null;
    main_question: string | null;
  } | null = null;

  if (purchased) {
    const { data } = await supabase
      .from("espirito_messages")
      .select("id, role, content, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true })
      .limit(50);
    messages = data || [];
    const userCount = messages.filter((m) => m.role === "user").length;
    remaining = Math.max(0, 3 - userCount);

    const { data: profileData } = await supabase
      .from("espirito_profile")
      .select("full_name, age, lost_loved_one, who_to_talk, main_question")
      .eq("user_id", user!.id)
      .maybeSingle();
    espiritoProfile = profileData;
  }

  const kiwifyUrl = process.env.NEXT_PUBLIC_KIWIFY_ESPIRITO_URL || "#";

  return (
    <EspiritoMentorClient
      purchased={purchased}
      justPurchased={justPurchased}
      firstName={firstName}
      kiwifyUrl={kiwifyUrl}
      initialMessages={messages}
      initialRemaining={remaining}
      hasProfile={!!espiritoProfile?.main_question}
    />
  );
}
