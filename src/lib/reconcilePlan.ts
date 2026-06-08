// Reconciliação idempotente do PLANO de assinatura (basic/premium).
//
// Por que existe (bug "paguei e continuo sem acesso"):
//   - O webhook Kiwify só grava `users.plan` se a conta JÁ existe no momento do
//     pagamento. Quem paga ANTES de criar a conta (caso MUITO comum) fica com o
//     plano apenas na tabela `purchases`.
//   - O /api/auth/signup faz o backfill, mas só por email EXATO e só uma vez.
//   - Magic-link (público 60+) cria a conta via Supabase OTP SEM passar pelo
//     /api/auth/signup → o backfill nunca roda pra esses usuários.
//   Resultado: clientes pagantes presos em "free", mesmo logando.
//
// Esta função roda nos MESMOS checkpoints do reconcileChatCredits (dashboard,
// /api/chat e signup) e CURA o plano a partir de `purchases`. É idempotente.
// Só faz UPGRADE — nunca rebaixa (cancelamento/reembolso é tratado pelo
// webhook), pra não cortar acesso de quem está num ciclo pago.

import type { SupabaseClient } from "@supabase/supabase-js";

const RANK: Record<string, number> = { free: 0, basic: 1, premium: 2 };

const CANCEL_EVENTS = new Set([
  "order.refunded",
  "order_refunded",
  "subscription.canceled",
  "subscription_canceled",
]);

export async function reconcileUserPlan(
  admin: SupabaseClient,
  userId: string,
  email: string
): Promise<{ changed: boolean; plan: string }> {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (!userId || !normalizedEmail) return { changed: false, plan: "free" };

  // 1. Estado atual do user
  const { data: userRow } = await admin
    .from("users")
    .select("plan, kiwify_order_id")
    .eq("id", userId)
    .maybeSingle();

  if (!userRow) return { changed: false, plan: "free" };
  const currentPlan = (userRow.plan as string) || "free";

  // 2. Última compra relevante a assinatura (basic/premium) OU evento de
  //    cancelamento/reembolso, pra este email.
  const { data: rows } = await admin
    .from("purchases")
    .select("plan, event, kiwify_order_id, created_at")
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(50);

  const latest = (rows ?? []).find(
    (r) =>
      r.plan === "basic" ||
      r.plan === "premium" ||
      CANCEL_EVENTS.has(r.event as string)
  );
  if (!latest) return { changed: false, plan: currentPlan };

  const entitled = CANCEL_EVENTS.has(latest.event as string)
    ? "free"
    : (latest.plan as string);

  // 3. Só UPGRADE. Se a última coisa foi cancelamento/reembolso (entitled=free)
  //    ou o plano devido é igual/menor, não mexe — downgrade é do webhook.
  if ((RANK[entitled] ?? 0) <= (RANK[currentPlan] ?? 0)) {
    return { changed: false, plan: currentPlan };
  }

  // 4. Liga compras órfãs (user_id null) a este usuário.
  await admin
    .from("purchases")
    .update({ user_id: userId })
    .eq("email", normalizedEmail)
    .is("user_id", null);

  // 5. Aplica o plano.
  await admin
    .from("users")
    .update({
      plan: entitled,
      kiwify_order_id: latest.kiwify_order_id ?? userRow.kiwify_order_id ?? null,
    })
    .eq("id", userId);

  return { changed: true, plan: entitled };
}
