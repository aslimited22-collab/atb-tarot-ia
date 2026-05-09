// Integração: exercita findPendingDeliveries com um cliente Supabase mockado.
// Garante que (a) a query é construída com os filtros certos e
// (b) o resultado é parseado corretamente — sem precisar de Postgres real.

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findPendingDeliveries,
  summarizeRow,
  type PendingOrderRow,
} from "@/lib/check-pending";

type CallTrace = {
  table?: string;
  select?: string;
  eqs: Array<[string, unknown]>;
  gtes: Array<[string, unknown]>;
  ors: string[];
  orders: Array<[string, { ascending: boolean }]>;
};

function makeMockClient(rows: PendingOrderRow[]): {
  client: SupabaseClient;
  trace: CallTrace;
} {
  const trace: CallTrace = { eqs: [], gtes: [], ors: [], orders: [] };

  const builder = {
    select(cols: string) {
      trace.select = cols;
      return this;
    },
    eq(col: string, val: unknown) {
      trace.eqs.push([col, val]);
      return this;
    },
    gte(col: string, val: unknown) {
      trace.gtes.push([col, val]);
      return this;
    },
    or(expr: string) {
      trace.ors.push(expr);
      return this;
    },
    order(col: string, opts: { ascending: boolean }) {
      trace.orders.push([col, opts]);
      // Última chamada retorna a Promise — emulamos com .then via resolved value
      return Promise.resolve({ data: rows, error: null });
    },
  };

  const client = {
    from(tbl: string) {
      trace.table = tbl;
      return builder;
    },
  } as unknown as SupabaseClient;

  return { client, trace };
}

const FIXED_NOW = new Date("2026-05-08T12:00:00Z");

describe("findPendingDeliveries", () => {
  it("monta a query com filtros corretos", async () => {
    const { client, trace } = makeMockClient([]);
    const result = await findPendingDeliveries(client, { now: FIXED_NOW });

    expect(trace.table).toBe("orders");
    expect(trace.select).toContain("delivery_status");
    expect(trace.select).toContain("delivery_attempts");
    expect(trace.select).toContain("delivery_last_error");

    // status=paid AND product_type=limpeza_espiritual
    const eqMap = new Map(trace.eqs);
    expect(eqMap.get("status")).toBe("paid");
    expect(eqMap.get("product_type")).toBe("limpeza_espiritual");

    // janela de 72h
    expect(trace.gtes).toHaveLength(1);
    const [gteCol, gteVal] = trace.gtes[0];
    expect(gteCol).toBe("created_at");
    const since = new Date(String(gteVal));
    const diffMs = FIXED_NOW.getTime() - since.getTime();
    expect(diffMs).toBe(72 * 3600 * 1000);

    // OR com null + estados não-finais
    expect(trace.ors).toHaveLength(1);
    expect(trace.ors[0]).toContain("delivery_status.is.null");
    expect(trace.ors[0]).toContain("pending");
    expect(trace.ors[0]).toContain("failed");
    expect(trace.ors[0]).toContain("manual_review");

    // Ordenação por created_at DESC
    expect(trace.orders).toEqual([["created_at", { ascending: false }]]);

    expect(result.rows).toEqual([]);
    expect(result.sinceIso).toBe("2026-05-05T12:00:00.000Z");
  });

  it("retorna linhas e respeita janela customizada", async () => {
    const rows: PendingOrderRow[] = [
      {
        id: "11111111-2222-3333-4444-555555555555",
        email: "maria@example.com",
        name: "Maria Santos",
        phone: "+5547999991234",
        created_at: "2026-05-08T10:00:00Z",
        delivery_status: "failed",
        delivery_attempts: 2,
        delivery_last_error: "email:resend_error:something",
        status: "paid",
        product_type: "limpeza_espiritual",
      },
    ];
    const { client, trace } = makeMockClient(rows);
    const result = await findPendingDeliveries(client, {
      now: FIXED_NOW,
      hoursWindow: 24,
    });

    expect(result.rows).toEqual(rows);
    const since = new Date(trace.gtes[0][1] as string);
    expect(FIXED_NOW.getTime() - since.getTime()).toBe(24 * 3600 * 1000);
  });

  it("propaga erro do Supabase como Error", async () => {
    const errClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              gte: () => ({
                or: () => ({
                  order: () =>
                    Promise.resolve({
                      data: null,
                      error: { message: "permission denied" },
                    }),
                }),
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(findPendingDeliveries(errClient)).rejects.toThrow(/permission denied/);
  });
});

describe("summarizeRow", () => {
  it("trunca id, email e mensagens para output amigável", () => {
    const row: PendingOrderRow = {
      id: "abcdef12-3456-7890-abcd-ef1234567890",
      email: "alguem@exemplo.com",
      name: "Maria das Dores Exageradamente Longo Nome",
      phone: "+5547999991234",
      created_at: "2026-05-07T18:42:30Z",
      delivery_status: null,
      delivery_attempts: null,
      delivery_last_error: "x".repeat(120),
      status: "paid",
      product_type: "limpeza_espiritual",
    };
    const out = summarizeRow(row);
    expect(out.id).toBe("abcdef12…");
    expect(out.delivery_status).toBe("null");
    expect(out.attempts).toBe(0);
    expect(out.last_error.length).toBe(60);
    expect(out.created).toBe("2026-05-07 18:42");
  });
});
