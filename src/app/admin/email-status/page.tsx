import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import EmailStatusClient from "./client";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type EmailRow = {
  id: string;
  to_email: string;
  subject: string;
  scope: string;
  ref_id: string | null;
  attempts: number;
  next_try_at: string;
  sent_at: string | null;
  last_error: string | null;
  resend_id: string | null;
  created_at: string;
};

export type EmailStatusProps = {
  generatedAt: string;
  kpis: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
  rows: EmailRow[];
};

export default async function EmailStatusPage() {
  // Auth: admin email check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
    redirect("/login?next=/admin/email-status");
  }

  const admin = createAdminClient();

  // KPIs últimos 7 dias
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [
    { count: total },
    { count: sent },
    { count: failed },
    { count: pending },
  ] = await Promise.all([
    admin.from("email_outbox").select("*", { count: "exact", head: true }).gte("created_at", since7d),
    admin.from("email_outbox").select("*", { count: "exact", head: true }).gte("created_at", since7d).not("sent_at", "is", null),
    admin.from("email_outbox").select("*", { count: "exact", head: true }).gte("created_at", since7d).is("sent_at", null).gte("attempts", 6),
    admin.from("email_outbox").select("*", { count: "exact", head: true }).gte("created_at", since7d).is("sent_at", null).lt("attempts", 6),
  ]);

  // Últimas 100 rows
  const { data: rows } = await admin
    .from("email_outbox")
    .select("id, to_email, subject, scope, ref_id, attempts, next_try_at, sent_at, last_error, resend_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const props: EmailStatusProps = {
    generatedAt: new Date().toISOString(),
    kpis: {
      total: total ?? 0,
      sent: sent ?? 0,
      failed: failed ?? 0,
      pending: pending ?? 0,
    },
    rows: (rows as EmailRow[]) || [],
  };

  return <EmailStatusClient {...props} />;
}
