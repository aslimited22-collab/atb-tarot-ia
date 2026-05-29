"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n/I18nProvider";

// label opcional — se não passado, usa a tradução padrão "Voltar para o Painel"
// no idioma do cliente. É client component (useT) mas pode ser usado dentro
// de server components normalmente (hidrata no cliente, igual o resto da UI i18n).
export function BackButton({ href = "/dashboard", label }: { href?: string; label?: string }) {
  const { t } = useT();
  const text = label ?? t("nav.back_panel");
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: "#fbf8ff",
        fontSize: 16,
        fontWeight: 700,
        textDecoration: "none",
        marginBottom: 18,
        padding: "12px 18px",
        borderRadius: 12,
        background: "rgba(232,184,75,0.12)",
        border: "1.5px solid rgba(232,184,75,0.4)",
        minHeight: 48,
        transition: "background .15s",
      }}
    >
      <span style={{ fontSize: 20 }}>←</span>
      <span>{text}</span>
    </Link>
  );
}
