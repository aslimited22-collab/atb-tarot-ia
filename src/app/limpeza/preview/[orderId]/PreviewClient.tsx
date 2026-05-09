"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/I18nProvider";
import { formatMoney } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

type Props = {
  orderId: string;
  previewText: string | null;
  checkoutUrl: string;
  price: number;
  currency?: string;
  provider?: string;
};

/**
 * Mostra a prévia. Se o servidor ainda não a tem (race possível em dev),
 * tenta recuperar da sessionStorage como fallback.
 */
export function PreviewClient({
  orderId,
  previewText: serverPreview,
  checkoutUrl,
  price,
  currency = "BRL",
  provider = "kiwify",
}: Props) {
  const [text, setText] = useState<string | null>(serverPreview);
  const { t, locale } = useT();

  const priceLabel = formatMoney(price, currency, locale as Locale);
  const ctaLabel = `${t("v2.preview.cta")} — ${priceLabel}`;
  const securityLabel = t("v2.preview.payment_secure");
  const previewHeader = t("v2.preview.header");
  const loadingLabel = t("v2.preview.preparing");

  useEffect(() => {
    if (text) return;
    try {
      const cached = sessionStorage.getItem(`limpeza_v2_${orderId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.previewText) setText(parsed.previewText);
      }
    } catch {}
  }, [orderId, text]);

  return (
    <>
      {/* Prévia */}
      <div className="card-gold" style={{ padding: "26px 22px", marginBottom: 22 }}>
        <div style={{ fontSize: 14, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 700 }}>
          {previewHeader}
        </div>
        {text ? (
          <p style={{
            fontSize: 19,
            color: "#fbf8ff",
            lineHeight: 1.75,
            margin: 0,
            whiteSpace: "pre-wrap",
            fontWeight: 500,
          }}>
            {text}
          </p>
        ) : (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ display: "inline-flex", gap: 6, marginBottom: 10 }} aria-hidden="true">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <p style={{ color: "#c4b5fd", fontSize: 17, margin: 0, fontWeight: 500 }}>
              {loadingLabel}
            </p>
          </div>
        )}
      </div>

      {/* CTA Pagamento */}
      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gold btn-big"
        style={{
          display: "block",
          textAlign: "center",
          textDecoration: "none",
          width: "100%",
          border: "none",
        }}
      >
        {ctaLabel}
      </a>

      <p style={{ fontSize: 14, color: "#c4b5fd", textAlign: "center", marginTop: 12, lineHeight: 1.55 }}>
        {securityLabel}
      </p>
    </>
  );
}
