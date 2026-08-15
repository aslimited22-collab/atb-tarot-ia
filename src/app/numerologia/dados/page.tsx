import type { Metadata } from "next";
import DadosClient from "./DadosClient";

// Pós-compra da Numerologia: cliente chega da página de obrigado (Kiwify
// ?pedido={order_id}) ou do success_url do Stripe ({CHECKOUT_SESSION_ID}) ou
// do e-mail (nosso UUID). O client resolve o token via /api/numerologia/pedido
// (poll — webhook pode atrasar) e mostra o form nome+nascimento.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seus dados — Numerologia | ATB",
  robots: { index: false, follow: false },
};

export default function NumerologiaDadosPage({
  searchParams,
}: {
  searchParams?: { pedido?: string };
}) {
  const token = (searchParams?.pedido || "").trim().slice(0, 200);
  return <DadosClient token={token} />;
}
