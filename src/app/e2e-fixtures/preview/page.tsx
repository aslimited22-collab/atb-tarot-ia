// Fixture E2E para a tela /limpeza/preview — só renderiza quando E2E_TEST=1.
// Em produção, retorna 404.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PreviewClient } from "../../limpeza/preview/[orderId]/PreviewClient";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default function PreviewE2EFixture() {
  if (process.env.E2E_TEST !== "1") notFound();

  const { t } = getServerT();
  const previewText =
    "Querida alma, vejo que você está num momento de virada. Há uma camada de cansaço no seu peito que não é só sua — você absorveu peso de pessoas que ama. A luz está vindo, e eu vou te mostrar o caminho na sessão completa.";

  return (
    <main style={{ background: "#120025", color: "#fbf8ff", minHeight: "100vh", padding: "32px 20px 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link
          href="/limpeza"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "#c4b5fd",
            fontSize: 20,
            textDecoration: "none",
            marginBottom: 20,
            padding: "18px 22px",
            minHeight: 64,
            borderRadius: 12,
            background: "rgba(196,181,253,0.08)",
            fontWeight: 600,
          }}
        >
          {t("v2.back")}
        </Link>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🕊️</div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
              color: "#e8b84b",
              lineHeight: 1.15,
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            {t("v2.preview.title", { name: "Maria" })}
          </h1>
          <p style={{ fontSize: 20, color: "#fbf8ff", lineHeight: 1.55, fontWeight: 500 }}>
            {t("v2.preview.subtitle")}
          </p>
        </div>

        <PreviewClient
          orderId="00000000-0000-0000-0000-e2e000000002"
          previewText={previewText}
          checkoutUrl="https://example.com/checkout-fixture"
          price={97}
          currency="BRL"
          provider="kiwify"
        />
      </div>
    </main>
  );
}
