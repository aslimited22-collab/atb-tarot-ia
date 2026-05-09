import { createClient } from "@/lib/supabase/server";
import { UpgradeLock } from "@/components/UpgradeLock";
import { BackButton } from "@/components/BackButton";
import { JournalClient } from "./client";
import { getServerT } from "@/lib/i18n/server";
import type { Plan } from "@/lib/types";

export default async function JournalPage() {
  const supabase = createClient();
  const { t } = getServerT();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("users").select("plan").eq("id", user!.id).maybeSingle();
  const plan: Plan = (data?.plan as Plan) || "free";

  if (plan === "free") {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <BackButton />
        <h1 className="serif text-3xl gold mb-6">{t("journal.locked_h1")}</h1>
        <UpgradeLock required="basic" />
      </div>
    );
  }

  return <JournalClient />;
}
