import { createClient } from "@/lib/supabase/server";
import { UpgradeLock } from "@/components/UpgradeLock";
import { AddictionClient } from "./client";
import type { Plan } from "@/lib/types";

export default async function AddictionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("users").select("plan").eq("id", user!.id).maybeSingle();
  const plan: Plan = (data?.plan as Plan) || "free";

  if (plan !== "premium") {
    return (
      <div className="p-6 md:p-10">
        <h1 className="serif text-3xl gold mb-6">Guia de Vícios</h1>
        <UpgradeLock required="premium" />
      </div>
    );
  }

  return <AddictionClient />;
}
