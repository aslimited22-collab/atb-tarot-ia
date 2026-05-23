import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import InsightsClient from "./client";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALL_SALE_EVENTS = [
  "order.approved", "order_approved",
  "pergunta1_purchased", "pergunta3_purchased", "pergunta7_purchased",
  "pergunta1_purchased_intl", "pergunta3_purchased_intl", "pergunta7_purchased_intl",
  "limpeza_purchased", "limpeza_v2_purchased", "limpeza_v2_purchased_intl",
  "espirito_purchased", "video_call_purchased", "videochamada_purchased_intl",
  "basic_purchased_intl", "premium_purchased_intl",
];

const REFUND_EVENTS = ["order.refunded", "order_refunded", "subscription.canceled", "subscription_canceled"];

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "basic" | "premium";
  creditsBalance: number;
  creditsTotalPurchased: number;
  createdAt: string;
  messagesSent: number;
  lastMessageAt: string | null;
  totalSpentCents: number;
  purchaseCount: number;
};

export type DayPoint = { date: string; revenue: number; orders: number; messages: number };

export type InsightsProps = {
  generatedAt: string;
  kpis: {
    revenueAllTime: number;
    revenue30d: number;
    revenue7d: number;
    totalOrders: number;
    activeSubscribers: number;
    creditsTotalPurchased: number;
    messagesTotal: number;
    refundRatePct: number;
  };
  recoveryKpis: {
    /** % de purchases dos últimos 7d que TÊM atividade subsequente em chat/limpeza/espirito */
    accessRate7dPct: number;
    /** Total de purchases dos últimos 7d */
    purchases7d: number;
    /** Recovery emails enviados (cron.follow-up) últimos 7d */
    recoverySent7d: number;
    /** Fuzzy matches realizados últimos 7d */
    fuzzyMatches7d: number;
    /** Emails na fila (pending no email_outbox) */
    emailQueuePending: number;
  };
  spark7d: {
    revenue: number[];
    orders: number[];
    messages: number[];
  };
  series30d: DayPoint[];
  users: UserRow[];
};

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function InsightsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = (user?.email || "").toLowerCase();
  if (!user || !ADMIN_EMAILS.includes(email)) redirect("/login");

  const admin = createAdminClient();

  const now = new Date();
  const ms7d = now.getTime() - 6 * 86400000;
  const ms30d = now.getTime() - 29 * 86400000;
  const iso7d = new Date(ms7d).toISOString();
  const iso30d = new Date(ms30d).toISOString();

  const [
    { data: usersRows },
    { data: chatMsgs },
    { data: salesPurchases },
    { count: refundsCount },
    { count: activeSubs },
  ] = await Promise.all([
    admin
      .from("users")
      .select("id, email, name, plan, chat_credits_balance, chat_credits_total_purchased, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("chat_messages")
      .select("user_id, role, created_at"),
    admin
      .from("purchases")
      .select("user_id, email, amount_cents, event, created_at")
      .in("event", ALL_SALE_EVENTS),
    admin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .in("event", REFUND_EVENTS),
    admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .in("plan", ["basic", "premium"]),
  ]);

  // Per-user aggregation
  type Agg = { count: number; last: string | null };
  const msgsByUser = new Map<string, Agg>();
  for (const m of chatMsgs ?? []) {
    if (m.role !== "user" || !m.user_id) continue;
    const cur = msgsByUser.get(m.user_id) ?? { count: 0, last: null };
    cur.count++;
    if (!cur.last || m.created_at > cur.last) cur.last = m.created_at;
    msgsByUser.set(m.user_id, cur);
  }

  const spentByUser = new Map<string, { cents: number; count: number }>();
  // Link orphan purchases by email for users that don't have user_id set
  const userByEmail = new Map<string, string>();
  for (const u of usersRows ?? []) userByEmail.set(u.email.toLowerCase(), u.id);

  for (const p of salesPurchases ?? []) {
    const uid = p.user_id ?? (p.email ? userByEmail.get(p.email.toLowerCase()) : null);
    if (!uid) continue;
    const cur = spentByUser.get(uid) ?? { cents: 0, count: 0 };
    cur.cents += p.amount_cents ?? 0;
    cur.count++;
    spentByUser.set(uid, cur);
  }

  const users: UserRow[] = (usersRows ?? []).map((u) => {
    const a = msgsByUser.get(u.id);
    const s = spentByUser.get(u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      plan: (u.plan as UserRow["plan"]) ?? "free",
      creditsBalance: u.chat_credits_balance ?? 0,
      creditsTotalPurchased: u.chat_credits_total_purchased ?? 0,
      createdAt: u.created_at,
      messagesSent: a?.count ?? 0,
      lastMessageAt: a?.last ?? null,
      totalSpentCents: s?.cents ?? 0,
      purchaseCount: s?.count ?? 0,
    };
  });

  // KPI aggregates
  const revenueAllCents = (salesPurchases ?? []).reduce((acc, p) => acc + (p.amount_cents ?? 0), 0);
  const revenue30dCents = (salesPurchases ?? [])
    .filter((p) => p.created_at >= iso30d)
    .reduce((acc, p) => acc + (p.amount_cents ?? 0), 0);
  const revenue7dCents = (salesPurchases ?? [])
    .filter((p) => p.created_at >= iso7d)
    .reduce((acc, p) => acc + (p.amount_cents ?? 0), 0);

  const totalOrders = (salesPurchases ?? []).length;
  const refunds = refundsCount ?? 0;
  const totalEvents = totalOrders + refunds;
  const refundRatePct = totalEvents > 0 ? (refunds / totalEvents) * 100 : 0;

  const messagesTotal = (chatMsgs ?? []).filter((m) => m.role === "user").length;
  const creditsTotalPurchased = (usersRows ?? []).reduce(
    (acc, u) => acc + (u.chat_credits_total_purchased ?? 0),
    0
  );

  // 30-day series + 7-day sparklines
  const dayMap = new Map<string, DayPoint>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - (29 - i) * 86400000);
    dayMap.set(isoDay(d), { date: isoDay(d), revenue: 0, orders: 0, messages: 0 });
  }
  for (const p of salesPurchases ?? []) {
    const day = (p.created_at as string).slice(0, 10);
    const e = dayMap.get(day);
    if (e) {
      e.revenue += (p.amount_cents ?? 0) / 100;
      e.orders++;
    }
  }
  for (const m of chatMsgs ?? []) {
    if (m.role !== "user") continue;
    const day = (m.created_at as string).slice(0, 10);
    const e = dayMap.get(day);
    if (e) e.messages++;
  }

  const series30d = Array.from(dayMap.values());
  const spark7d = {
    revenue: series30d.slice(-7).map((p) => p.revenue),
    orders: series30d.slice(-7).map((p) => p.orders),
    messages: series30d.slice(-7).map((p) => p.messages),
  };

  // ─── Recovery KPIs ───────────────────────────────────────
  // Métricas pra medir se sprints 1+2 reduziram a taxa de não-acesso (51% baseline)
  const purchases7d = (salesPurchases ?? []).filter((p) => p.created_at >= iso7d);
  const accessedUsers = new Set<string>();
  for (const m of chatMsgs ?? []) {
    if (m.user_id) accessedUsers.add(m.user_id);
  }
  // Também conta limpeza/espirito como "acessou"
  const [{ data: limpezaMsgs }, { data: espiritoMsgs }] = await Promise.all([
    admin.from("limpeza_messages").select("user_id"),
    admin.from("espirito_messages").select("user_id"),
  ]);
  for (const m of limpezaMsgs ?? []) if (m.user_id) accessedUsers.add(m.user_id);
  for (const m of espiritoMsgs ?? []) if (m.user_id) accessedUsers.add(m.user_id);

  const purchases7dWithAccess = purchases7d.filter((p) => {
    const uid = p.user_id ?? (p.email ? userByEmail.get(p.email.toLowerCase()) : null);
    return uid && accessedUsers.has(uid);
  });
  const accessRate7dPct = purchases7d.length > 0
    ? (purchases7dWithAccess.length / purchases7d.length) * 100
    : 0;

  // Recovery emails enviados últimos 7d (cron.follow-up scope)
  const [
    { count: recoverySent7d },
    { count: fuzzyMatches7d },
    { count: emailQueuePending },
  ] = await Promise.all([
    admin
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .like("scope", "cron.follow-up%")
      .gte("created_at", iso7d)
      .not("sent_at", "is", null),
    admin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("fuzzy_matched", true)
      .gte("created_at", iso7d),
    admin
      .from("email_outbox")
      .select("*", { count: "exact", head: true })
      .is("sent_at", null)
      .lt("attempts", 6),
  ]);

  const props: InsightsProps = {
    generatedAt: now.toISOString(),
    kpis: {
      revenueAllTime: revenueAllCents / 100,
      revenue30d: revenue30dCents / 100,
      revenue7d: revenue7dCents / 100,
      totalOrders,
      activeSubscribers: activeSubs ?? 0,
      creditsTotalPurchased,
      messagesTotal,
      refundRatePct,
    },
    recoveryKpis: {
      accessRate7dPct,
      purchases7d: purchases7d.length,
      recoverySent7d: recoverySent7d ?? 0,
      fuzzyMatches7d: fuzzyMatches7d ?? 0,
      emailQueuePending: emailQueuePending ?? 0,
    },
    spark7d,
    series30d,
    users,
  };

  return <InsightsClient {...props} />;
}
