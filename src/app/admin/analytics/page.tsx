import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AnalyticsClient from "./client";
import type {
  DayStat,
  ProductSlice,
  ProviderBar,
  DeliverySlice,
  KpiCards,
  AnalyticsClientProps,
} from "./client";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "aslimited22@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function buildDailyStats(
  rows: { created_at: string; amount_cents: number | null }[],
  startDate: Date
): DayStat[] {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    map.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    if (map.has(day)) {
      const entry = map.get(day)!;
      entry.revenue += (row.amount_cents ?? 0) / 100;
      entry.orders += 1;
    }
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
}

const EVENT_TO_PLAN: Record<string, string> = {
  "pergunta1_purchased": "pergunta1", "pergunta1_purchased_intl": "pergunta1",
  "pergunta3_purchased": "pergunta3", "pergunta3_purchased_intl": "pergunta3",
  "pergunta7_purchased": "pergunta7", "pergunta7_purchased_intl": "pergunta7",
  "limpeza_purchased": "limpeza", "limpeza_v2_purchased": "limpeza_v2",
  "limpeza_v2_purchased_intl": "limpeza_v2",
  "espirito_purchased": "espirito",
  "video_call_purchased": "video_call", "videochamada_purchased_intl": "video_call",
  "basic_purchased_intl": "basic", "premium_purchased_intl": "premium",
};

function buildProductMix(
  rows: { plan: string | null; event: string; amount_cents: number | null }[]
): ProductSlice[] {
  const map = new Map<string, { count: number; totalCents: number }>();
  for (const r of rows) {
    const key = r.plan ?? EVENT_TO_PLAN[r.event] ?? "unknown";
    const cur = map.get(key) ?? { count: 0, totalCents: 0 };
    cur.count++;
    cur.totalCents += r.amount_cents ?? 0;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([plan, v]) => ({ plan, ...v }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

function inferProvider(event: string): string {
  if (event === "order.approved" || event === "order_approved") return "kiwify";
  if (event.endsWith("_intl")) return "stripe_intl";
  return "stripe_br";
}

function buildProviderSplit(
  rows: { event: string; amount_cents: number | null }[]
): ProviderBar[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const key = inferProvider(r.event);
    const cur = map.get(key) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += (r.amount_cents ?? 0) / 100;
    map.set(key, cur);
  }
  return Array.from(map.entries()).map(([provider, v]) => ({ provider, ...v }));
}

function buildDeliveryBreakdown(
  rows: { delivery_status: string | null }[]
): DeliverySlice[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.delivery_status ?? "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
}

function sumCents(rows: { amount_cents: number | null }[] | null): number {
  return (rows ?? []).reduce((acc, r) => acc + (r.amount_cents ?? 0), 0) / 100;
}

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = (user?.email || "").toLowerCase();
  if (!user || !ADMIN_EMAILS.includes(userEmail)) redirect("/login");

  const admin = createAdminClient();

  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterdayIso = new Date(now.getTime() - 86400000).toISOString();
  const weekStartIso = new Date(now.getTime() - 6 * 86400000).toISOString();
  const firstOfMonthIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const firstOfPrevMonthIso = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 86400000);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const APPROVED_EVENTS = ["order.approved", "order_approved"];

  // All events that represent a completed sale (Kiwify + Stripe BR + Stripe Intl)
  const ALL_SALE_EVENTS = [
    "order.approved", "order_approved",
    "pergunta1_purchased", "pergunta3_purchased", "pergunta7_purchased",
    "pergunta1_purchased_intl", "pergunta3_purchased_intl", "pergunta7_purchased_intl",
    "limpeza_purchased", "limpeza_v2_purchased", "limpeza_v2_purchased_intl",
    "espirito_purchased", "video_call_purchased", "videochamada_purchased_intl",
    "basic_purchased_intl", "premium_purchased_intl",
  ];

  const [
    { data: dailyRows },
    { data: todayRows },
    { data: yesterdayRows },
    { data: weekRows },
    { data: monthRows },
    { data: prevMonthRows },
    { data: allTimeRows },
    { count: refundsCount },
    { data: approvedMonthRows },
    { count: activeSubscribers },
    { data: productMixRows },
    { data: providerRows },
    { data: deliveryRows },
    { data: recentTxRows },
  ] = await Promise.all([
    // Últimos 30 dias para gráficos (todos os eventos de venda)
    admin
      .from("purchases")
      .select("created_at, amount_cents")
      .in("event", ALL_SALE_EVENTS)
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: true }),

    // Receita hoje
    admin
      .from("purchases")
      .select("amount_cents")
      .in("event", ALL_SALE_EVENTS)
      .gte("created_at", todayIso),

    // Receita ontem (para trend)
    admin
      .from("purchases")
      .select("amount_cents")
      .in("event", ALL_SALE_EVENTS)
      .gte("created_at", yesterdayIso)
      .lt("created_at", todayIso),

    // Receita semana
    admin
      .from("purchases")
      .select("amount_cents")
      .in("event", ALL_SALE_EVENTS)
      .gte("created_at", weekStartIso),

    // Receita mês
    admin
      .from("purchases")
      .select("amount_cents")
      .in("event", ALL_SALE_EVENTS)
      .gte("created_at", firstOfMonthIso),

    // Receita mês anterior (para trend)
    admin
      .from("purchases")
      .select("amount_cents")
      .in("event", ALL_SALE_EVENTS)
      .gte("created_at", firstOfPrevMonthIso)
      .lt("created_at", firstOfMonthIso),

    // Receita total
    admin
      .from("purchases")
      .select("amount_cents")
      .in("event", ALL_SALE_EVENTS),

    // Reembolsos este mês
    admin
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .in("event", [
        "order.refunded",
        "order_refunded",
        "subscription.canceled",
        "subscription_canceled",
      ])
      .gte("created_at", firstOfMonthIso),

    // Vendas este mês (para taxa reembolso)
    admin
      .from("purchases")
      .select("amount_cents", { count: "exact" })
      .in("event", ALL_SALE_EVENTS)
      .gte("created_at", firstOfMonthIso),

    // Assinantes ativos
    admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .in("plan", ["basic", "premium"]),

    // Mix de produtos — inclui avulsos Stripe + aprovações Kiwify
    admin
      .from("purchases")
      .select("plan, event, amount_cents")
      .in("event", ALL_SALE_EVENTS),

    // Split por provider — derivado do evento na tabela purchases
    admin
      .from("purchases")
      .select("event, amount_cents")
      .in("event", ALL_SALE_EVENTS),

    // Delivery status (Limpeza)
    admin
      .from("orders")
      .select("delivery_status")
      .eq("product_type", "limpeza_espiritual")
      .eq("status", "paid"),

    // Transações recentes (40 linhas)
    admin
      .from("purchases")
      .select("id, name, email, plan, event, amount_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const approvedMonthCount = approvedMonthRows?.length ?? 0;
  const refundRateValue =
    approvedMonthCount + (refundsCount ?? 0) > 0
      ? ((refundsCount ?? 0) / (approvedMonthCount + (refundsCount ?? 0))) * 100
      : 0;

  const kpi: KpiCards = {
    revenueToday: sumCents(todayRows),
    revenueYesterday: sumCents(yesterdayRows),
    revenueWeek: sumCents(weekRows),
    revenueMonth: sumCents(monthRows),
    revenuePrevMonth: sumCents(prevMonthRows),
    revenueAllTime: sumCents(allTimeRows),
    totalOrders: (allTimeRows ?? []).length,
    refundRate: refundRateValue,
    activeSubscribers: activeSubscribers ?? 0,
  };

  const props: AnalyticsClientProps = {
    kpi,
    dailyStats: buildDailyStats(dailyRows ?? [], thirtyDaysAgo),
    productMix: buildProductMix(productMixRows ?? []),
    providerSplit: buildProviderSplit(providerRows ?? []),
    deliveryBreakdown: buildDeliveryBreakdown(deliveryRows ?? []),
    recentTransactions: (recentTxRows ?? []) as AnalyticsClientProps["recentTransactions"],
  };

  return <AnalyticsClient {...props} />;
}
