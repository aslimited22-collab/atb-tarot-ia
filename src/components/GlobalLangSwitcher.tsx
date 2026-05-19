"use client";
import { usePathname } from "next/navigation";
import { LangSwitcher } from "./LangSwitcher";

// LangSwitcher já existe no header da landing (`/`), então escondemos lá pra
// não duplicar. Em todas as outras rotas, mostramos no canto superior direito
// pra permitir que o cliente troque a língua em qualquer página.

const HIDDEN_PATHS = ["/", "/admin"];

export default function GlobalLangSwitcher() {
  const pathname = usePathname() || "";
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  // Esconde também na home exata (pathname === "/")
  if (pathname === "/") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        right: 14,
        zIndex: 9996,
      }}
    >
      <LangSwitcher compact />
    </div>
  );
}
