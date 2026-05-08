import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerT } from "@/lib/i18n/server";
import { PreviewClient } from "./PreviewClient";

export const dynamic = "force-dynamic";

const PRICE = Number(process.env.LIMPEZA_V2_PRICE || 97);

export default async function PreviewPage({ params }: { params: { orderId: string } }) {
  const orderId = params.orderId;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) notFound();

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, name, email, status, theme, checkout_url, amount, currency, payment_provider")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  // Se ja pago, manda direto pra entrega
  if (order.status === "paid") {
    redirect(`/entrega/${orderId}`);
  }

  const { data: reading } = await admin
    .from("readings")
    .select("preview_text, generation_status")
    .eq("order_id", orderId)
    .maybeSingle();

  const previewText = reading?.preview_text || null;
  const baseCheckout = process.env.NEXT_PUBLIC_KIWIFY_LIMPEZA_URL || "";
  const checkoutUrl =
    order.checkout_url ||
    (baseCheckout
      ? `${baseCheckout}${baseCheckout.includes("?") ? "&" : "?"}external_reference=${order.id}&email=${encodeURIComponent(order.email)}`
      : "#");

  const firstName = (order.name || "querida").split(" ")[0];
  const price = order.amount || PRICE;
  const { t } = getServerT();

  return (
    <main style={{ background: "#120025", color: "#fbf8ff", minHeight: "100vh", padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href="/limpeza" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "#c4b5fd", fontSize: 15, textDecoration: "none",
          marginBottom: 20, padding: "10px 14px", borderRadius: 12,
          background: "rgba(196,181,253,0.08)", fontWeight: 600,
        }}>{t("v2.back")}</Link>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🕊️</div>
          <h1 className="serif" style={{
            fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
            color: "#e8b84b",
            lineHeight: 1.15,
            marginBottom: 10,
            fontWeight: 700,
          }}>
            {t("v2.preview.title", { name: firstName })}
          </h1>
          <p style={{ fontSize: 17, color: "#fbf8ff", lineHeight: 1.55, fontWeight: 500 }}>
            {t("v2.preview.subtitle")}
          </p>
        </div>

        <PreviewClient
          orderId={orderId}
          previewText={previewText}
          checkoutUrl={checkoutUrl}
          price={price}
          currency={order.currency || "BRL"}
          provider={order.payment_provider || "kiwify"}
        />

        <div style={{
          marginTop: 28,
          padding: "20px 18px",
          background: "rgba(232,184,75,0.08)",
          border: "1px solid rgba(232,184,75,0.25)",
          borderRadius: 14,
        }}>
          <p style={{ fontSize: 14, color: "#fbf8ff", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            {t("v2.preview.security")}<br />
            {t("v2.preview.security2")}
          </p>
        </div>
      </div>
    </main>
  );
}
