"use client";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/I18nProvider";

const HIDDEN_PATHS = [
  "/dashboard/chat",
  "/dashboard/espirito-mentor",
  "/dashboard/limpeza-espiritual",
  "/limpeza/preview",
  // Landing de tráfego pago R$29: WhatsApp NÃO pode concorrer com o CTA de
  // compra (brief 18/07 — 12 begin_checkout, 0 compras). Lá o WhatsApp é só
  // link discreto de suporte no rodapé da própria página.
  "/limpeza-espiritual",
  "/entrega",
  "/admin",
];

// Botao flutuante de contato:
// - locale "pt": WhatsApp verde (Z-API + numero BR funcionam normalmente)
// - locale != "pt" (en/es/de/it/ja): Email mailto: (americano nao usa WhatsApp,
//   e voce nao quer dar suporte por roaming intl). Override via env
//   NEXT_PUBLIC_SUPPORT_EMAIL pra trocar o destinatario.
export default function WhatsAppFloat() {
  const pathname = usePathname() || "";
  const { t, locale } = useT();
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const isPT = locale === "pt";

  // Branch WhatsApp (BR)
  if (isPT) {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
    if (!phone) return null;
    const msg = encodeURIComponent(t("nav.whatsapp_message"));
    const href = `https://wa.me/${phone}?text=${msg}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("nav.whatsapp_label")}
        style={floatStyle("#25D366", "rgba(37,211,102,0.45)")}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    );
  }

  // Branch Email (intl) — substitui WhatsApp pra US/EU/JP
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "atb@atbtartot.com";
  const subject = encodeURIComponent(t("nav.email_support_subject"));
  const href = `mailto:${supportEmail}?subject=${subject}`;
  return (
    <a
      href={href}
      aria-label={t("nav.email_support_label")}
      style={floatStyle("#e8b84b", "rgba(232,184,75,0.45)")}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="#120025" aria-hidden="true">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    </a>
  );
}

function floatStyle(bg: string, shadow: string) {
  return {
    position: "fixed" as const,
    bottom: "calc(env(safe-area-inset-bottom, 0) + 96px)",
    right: 16,
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: bg,
    boxShadow: `0 6px 20px ${shadow}, 0 2px 6px rgba(0,0,0,0.3)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
    textDecoration: "none",
    transition: "transform 0.15s",
  };
}
