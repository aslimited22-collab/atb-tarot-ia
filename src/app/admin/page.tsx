import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminClient from "./client";

export const dynamic = "force-dynamic";

// Lista de admins separada por vírgula. Fallback no email original para não quebrar prod
// caso a env var não esteja configurada.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = (user?.email || "").toLowerCase();
  if (!user || !ADMIN_EMAILS.includes(userEmail)) redirect("/login");

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
