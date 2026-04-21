import { createClient } from "@/lib/supabase/server";
import { UpgradeLock } from "@/components/UpgradeLock";
import { JournalClient } from "./client";
import type { Plan } from "@/lib/types";

export default async function JournalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("users").select("plan").eq("id", user!.id).maybeSingle();
  const plan: Plan = (data?.plan as Plan) || "free";

  if (plan === "free") {
    return (
      <div className="p-6 md:p-10">
        <h1 className="serif text-3xl gold mb-6">Diário da Ansiedade</h1>
        <UpgradeLock required="basic" />
      </div>
    );
  }

  return <JournalClient />;
}
