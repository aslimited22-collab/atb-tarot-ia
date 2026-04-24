import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import type { Plan } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("plan, email").eq("id", user.id).maybeSingle();

  const plan: Plan = (profile?.plan as Plan) || "free";
  const email = profile?.email || user.email || "";

  return (
    <div className="min-h-screen md:flex" style={{ background: "#120025" }}>
      <Sidebar email={email} plan={plan} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
