// Eventos de funil do Google Ads (client-side).
// Todos os rótulos vêm de env vars NEXT_PUBLIC_* setadas SÓ em Production na
// Vercel — em dev/preview as vars não existem, então nenhum evento dispara.
import { GADS_ID } from "@/components/GoogleAdsTag";

const LEAD_LABEL = process.env.NEXT_PUBLIC_GADS_LEAD_LABEL || "";

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof gtag === "function" ? gtag : null;
}

/** Dispara a conversão "Lead/Cadastro" — chamar UMA vez, no sucesso do cadastro. */
export function fireGadsLead() {
  const gtag = getGtag();
  if (!gtag || !LEAD_LABEL || !GADS_ID) return;
  gtag("event", "conversion", {
    send_to: `${GADS_ID}/${LEAD_LABEL}`,
    transport_type: "beacon",
  });
}
