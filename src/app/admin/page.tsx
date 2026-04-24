import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminClient from "./client";

const ADMIN_EMAIL = "aslimited22@gmail.com";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    { data: customers },
    { data: purchases },
    { count: totalActive },
    { count: newToday },
    { count: refundsMonth },
    { data: revenueRows },
  ] = await Promise.all([
    admin
      .from("users")
      .select("id, email, name, plan, kiwify_order_id, created_at")
      .neq("plan", "free")
      .order("created_at", { ascending: false }),
    admin
      .from("purchases")
      .select("id, email, name, kiwify_order_id, plan, event, amount_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .neq("plan", "free"),
    admin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("event", "order.approved")
      .gte("created_at", today),
    admin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .in("event", ["order.refunded", "order_refunded", "subscription.canceled", "subscription_canceled"])
      .gte("created_at", firstOfMonth),
    admin
      .from("purchases")
      .select("amount_cents")
      .eq("event", "order.approved")
      .gte("created_at", firstOfMonth),
  ]);

  const revenueCents = (revenueRows ?? []).reduce(
    (acc, r) => acc + (r.amount_cents ?? 0), 0
  );

  return (
    <AdminClient
      customers={customers ?? []}
      purchases={purchases ?? []}
      metrics={{
        totalActive: totalActive ?? 0,
        newToday: newToday ?? 0,
        refundsMonth: refundsMonth ?? 0,
        revenueCents,
      }}
    />
  );
}
