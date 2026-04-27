import Link from "next/link";

export function BackButton({ href = "/dashboard", label = "Voltar para o Painel" }: { href?: string; label?: string }) {
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
      <span>{label}</span>
    </Link>
  );
}
