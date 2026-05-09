// Lógica de busca de pedidos travados — usada pelo script CLI e pelos testes.
// Mantém a query num único lugar para que CLI e teste exercitem o mesmo código.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PendingOrderRow = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  created_at: string | null;
  delivery_status: string | null;
  delivery_attempts: number | null;
  delivery_last_error: string | null;
  status: string | null;
  product_type: string | null;
};

export type FindPendingOptions = {
  /** Limite de tempo (em horas) para considerar "recente". Default: 72. */
  hoursWindow?: number;
  /** Override do "now" — usado em testes para determinismo. */
  now?: Date;
};

export type FindPendingResult = {
  rows: PendingOrderRow[];
  sinceIso: string;
};

/**
 * Lista pedidos pagos (limpeza_espiritual) sem entrega confirmada nas últimas
 * `hoursWindow` horas (default 72). Joga erro se a query do Supabase falhar.
 */
export async function findPendingDeliveries(
  supabase: SupabaseClient,
  opts: FindPendingOptions = {}
): Promise<FindPendingResult> {
  const hoursWindow = opts.hoursWindow ?? 72;
  const nowMs = (opts.now ?? new Date()).getTime();
  const sinceIso = new Date(nowMs - hoursWindow * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,email,name,phone,created_at,delivery_status,delivery_attempts,delivery_last_error,status,product_type"
    )
    .eq("status", "paid")
    .eq("product_type", "limpeza_espiritual")
    .gte("created_at", sinceIso)
    .or("delivery_status.is.null,delivery_status.in.(pending,failed,manual_review)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`check-pending query failed: ${error.message}`);
  }

  return { rows: (data ?? []) as PendingOrderRow[], sinceIso };
}

export function summarizeRow(row: PendingOrderRow) {
  return {
    id: String(row.id).slice(0, 8) + "…",
    email: row.email ?? "—",
    name: (row.name ?? "").slice(0, 20),
    phone: row.phone ?? "—",
    created: String(row.created_at ?? "")
      .slice(0, 16)
      .replace("T", " "),
    delivery_status: row.delivery_status ?? "null",
    attempts: row.delivery_attempts ?? 0,
    last_error: (row.delivery_last_error ?? "").slice(0, 60),
  };
}
