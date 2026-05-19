// Reconciliação idempotente de créditos de pergunta avulsa.
//
// Por que existe:
//   1. Cliente compra pergunta1/3/7 via Kiwify.
//   2. Kiwify success_url manda cliente direto pra /obrigado-pergunta (instantâneo).
//   3. Webhook Kiwify é server-to-server — pode atrasar segundos/minutos.
//   4. Se o cliente clica/refresha antes do webhook, ele cai no chat com saldo 0.
//
// Esta função compara `chat_credits_total_purchased` (watermark) com a soma de
// créditos das purchases pergunta no banco. Se houver diferença, credita.
// Idempotente: chamar várias vezes não duplica saldo.

import type { SupabaseClient } from "@supabase/supabase-js";

const PERGUNTA_CREDITS: Record<string, number> = {
  pergunta1: 1,
  pergunta3: 3,
  pergunta7: 7,
};

const REFUND_EVENTS = ["order.refunded", "order_refunded"];

export async function reconcileChatCredits(
  admin: SupabaseClient,
  userId: string,
  email: string
): Promise<{ creditedNow: number; totalPurchased: number; balance: number }> {
  const normalizedEmail = email.toLowerCase();

  // 1. Lê estado atual do user
  const { data: userRow } = await admin
    .from("users")
    .select("chat_credits_balance, chat_credits_total_purchased")
    .eq("id", userId)
    .maybeSingle();

  if (!userRow) {
    return { creditedNow: 0, totalPurchased: 0, balance: 0 };
  }

  const currentBalance = userRow.chat_credits_balance ?? 0;
  const currentTotal = userRow.chat_credits_total_purchased ?? 0;

  // 2. Soma créditos das purchases pergunta NÃO reembolsadas
  const { data: purchases } = await admin
    .from("purchases")
    .select("plan, event")
    .eq("email", normalizedEmail)
    .in("plan", ["pergunta1", "pergunta3", "pergunta7"]);

  if (!purchases || purchases.length === 0) {
    return { creditedNow: 0, totalPurchased: currentTotal, balance: currentBalance };
  }

  let totalFromPurchases = 0;
  for (const p of purchases) {
    if (REFUND_EVENTS.includes(p.event)) continue;
    totalFromPurchases += PERGUNTA_CREDITS[p.plan as string] ?? 0;
  }

  const unclaimed = totalFromPurchases - currentTotal;
  if (unclaimed <= 0) {
    return { creditedNow: 0, totalPurchased: currentTotal, balance: currentBalance };
  }

  // 3. Link de purchases órfãs (user_id null) ao user atual
  await admin
    .from("purchases")
    .update({ user_id: userId })
    .eq("email", normalizedEmail)
    .is("user_id", null);

  // 4. Credita o diff (atômico via SQL increment)
  const newBalance = currentBalance + unclaimed;
  const newTotal = currentTotal + unclaimed;
  await admin
    .from("users")
    .update({
      chat_credits_balance: newBalance,
      chat_credits_total_purchased: newTotal,
    })
    .eq("id", userId);

  return { creditedNow: unclaimed, totalPurchased: newTotal, balance: newBalance };
}
