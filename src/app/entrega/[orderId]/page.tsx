import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerT } from "@/lib/i18n/server";
import { EntregaClient } from "./EntregaClient";

export const dynamic = "force-dynamic";

export default async function EntregaPage({ params }: { params: { orderId: string } }) {
  const orderId = params.orderId;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) notFound();

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, name, email, status, theme")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const { t } = getServerT();

  // Pendente -> mostra mensagem aguardando pagamento
  if (order.status === "pending") {
    return (
      <main style={{ background: "#120025", color: "#fbf8ff", minHeight: "100vh", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ fontSize: 64, marginBottom: 18 }}>⏳</div>
          <h1 className="serif" style={{ fontSize: "2rem", color: "#e8b84b", lineHeight: 1.15, marginBottom: 14, fontWeight: 700 }}>
            {t("v2.delivery.pending_title")}
          </h1>
          <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.65, marginBottom: 24, fontWeight: 500 }}>
            {t("v2.delivery.pending_desc")}
          </p>
          <Link href={`/limpeza/preview/${orderId}`} className="btn-gold" style={{ display: "inline-block", textDecoration: "none", padding: "16px 28px", border: "none" }}>
            {t("v2.delivery.pending_cta")}
          </Link>
        </div>
      </main>
    );
  }

  if (order.status !== "paid") {
    return (
      <main style={{ background: "#120025", color: "#fbf8ff", minHeight: "100vh", padding: "60px 20px", textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: "1.8rem", color: "#e8b84b" }}>{t("v2.delivery.pending_title")}</h1>
      </main>
    );
  }

  const { data: reading } = await admin
    .from("readings")
    .select("full_text, full_json, generation_status")
    .eq("order_id", orderId)
    .maybeSingle();

  const fullJson = reading?.full_json as any;
  const fullText = reading?.full_text;

  const whatsapp = process.env.NEXT_PUBLIC_ATB_WHATSAPP_URL || null;
  const firstName = (order.name || "querida").split(" ")[0];

  return (
    <EntregaClient
      orderId={orderId}
      firstName={firstName}
      fullJson={fullJson || null}
      fullText={fullText || null}
      generationStatus={reading?.generation_status || "pending"}
      whatsappUrl={whatsapp}
    />
  );
}
