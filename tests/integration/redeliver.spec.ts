// Integração: chama o handler do POST /api/admin/orders/[id]/redeliver
// diretamente, com mocks de createAdminClient e deliverLimpezaOrder.
// Não depende de servidor rodando nem de Supabase.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const VALID_ID = "11111111-2222-3333-4444-555555555555";
const ORIGINAL_ADMIN_SECRET = process.env.ADMIN_SECRET;

type OrderRow = {
  id: string;
  status: string;
  email: string;
  name: string;
  phone: string | null;
  locale: string | null;
  product_type: string;
};

type SelectChain = {
  select: (cols: string) => {
    eq: (col: string, val: string) => {
      maybeSingle: () => Promise<{ data: OrderRow | null; error: { message: string } | null }>;
    };
  };
};

function makeAdminMock(order: OrderRow | null, error: string | null = null) {
  const chain: SelectChain = {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: order,
          error: error ? { message: error } : null,
        }),
      }),
    }),
  };
  return { from: (_: string) => chain };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/delivery", () => ({
  deliverLimpezaOrder: vi.fn(),
}));

// Silencia o logger nos testes (mas mantém a forma da API)
vi.mock("@/lib/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

import { POST } from "@/app/api/admin/orders/[id]/redeliver/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverLimpezaOrder } from "@/lib/delivery";

const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedDeliver = vi.mocked(deliverLimpezaOrder);

function buildRequest(headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000/api/admin/orders/${VALID_ID}/redeliver`, {
    method: "POST",
    headers,
  });
}

describe("POST /api/admin/orders/[id]/redeliver", () => {
  beforeEach(() => {
    process.env.ADMIN_SECRET = "test-secret-abc-123";
    mockedCreateAdminClient.mockReset();
    mockedDeliver.mockReset();
  });

  afterEach(() => {
    if (ORIGINAL_ADMIN_SECRET === undefined) delete process.env.ADMIN_SECRET;
    else process.env.ADMIN_SECRET = ORIGINAL_ADMIN_SECRET;
  });

  it("retorna 401 sem header X-Admin-Secret", async () => {
    const res = await POST(buildRequest(), { params: { id: VALID_ID } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
    expect(mockedDeliver).not.toHaveBeenCalled();
  });

  it("retorna 401 com header errado", async () => {
    const res = await POST(buildRequest({ "x-admin-secret": "wrong" }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(401);
  });

  it("retorna 400 quando ADMIN_SECRET não está configurado no servidor", async () => {
    delete process.env.ADMIN_SECRET;
    const res = await POST(buildRequest({ "x-admin-secret": "anything" }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("admin secret not configured");
  });

  it("retorna 400 com id inválido", async () => {
    const res = await POST(buildRequest({ "x-admin-secret": "test-secret-abc-123" }), {
      params: { id: "not-a-uuid" },
    });
    expect(res.status).toBe(400);
  });

  it("retorna 404 quando o pedido não existe", async () => {
    mockedCreateAdminClient.mockReturnValue(makeAdminMock(null) as never);
    const res = await POST(buildRequest({ "x-admin-secret": "test-secret-abc-123" }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(404);
  });

  it("retorna 400 quando product_type não é limpeza_espiritual", async () => {
    mockedCreateAdminClient.mockReturnValue(
      makeAdminMock({
        id: VALID_ID,
        status: "paid",
        email: "x@y.com",
        name: "Maria",
        phone: null,
        locale: "pt",
        product_type: "outro_produto",
      }) as never
    );
    const res = await POST(buildRequest({ "x-admin-secret": "test-secret-abc-123" }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/limpeza/);
  });

  it("retorna 400 quando status != paid", async () => {
    mockedCreateAdminClient.mockReturnValue(
      makeAdminMock({
        id: VALID_ID,
        status: "pending",
        email: "x@y.com",
        name: "Maria",
        phone: null,
        locale: "pt",
        product_type: "limpeza_espiritual",
      }) as never
    );
    const res = await POST(buildRequest({ "x-admin-secret": "test-secret-abc-123" }), {
      params: { id: VALID_ID },
    });
    expect(res.status).toBe(400);
  });

  it("retorna 200 com DeliverResult quando autenticado e pedido válido", async () => {
    mockedCreateAdminClient.mockReturnValue(
      makeAdminMock({
        id: VALID_ID,
        status: "paid",
        email: "Cliente@Exemplo.com",
        name: "Maria Santos",
        phone: "+5547999991234",
        locale: "pt",
        product_type: "limpeza_espiritual",
      }) as never
    );
    mockedDeliver.mockResolvedValue({
      generation: { ok: true },
      email: { ok: true },
      whatsapp: { ok: true },
      finalDeliveryStatus: "both_sent",
    });

    const res = await POST(
      buildRequest({
        "x-admin-secret": "test-secret-abc-123",
        host: "atbtartot.com",
        "x-forwarded-proto": "https",
      }),
      { params: { id: VALID_ID } }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.orderId).toBe(VALID_ID);
    expect(body.result.finalDeliveryStatus).toBe("both_sent");

    expect(mockedDeliver).toHaveBeenCalledTimes(1);
    const args = mockedDeliver.mock.calls[0][0];
    expect(args.orderId).toBe(VALID_ID);
    expect(args.email).toBe("cliente@exemplo.com"); // lowercased
    expect(args.deliveryLink).toBe(`https://atbtartot.com/entrega/${VALID_ID}`);
    expect(args.internalGenUrl).toBe("https://atbtartot.com/api/limpeza/generate");
    expect(args.triggerGeneration).toBe(true);
  });
});
