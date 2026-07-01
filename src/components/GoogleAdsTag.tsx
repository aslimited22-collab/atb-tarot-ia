/* eslint-disable @next/next/no-before-interactive-script-outside-document */
import Script from "next/script";

// Tag global do Google Ads (gtag.js) — base pra:
//  - medir conversões (evento de Compra nas páginas /obrigado-*)
//  - remarketing (públicos de visitantes no Google Ads)
//  - conversões aprimoradas (casa a venda pelo e-mail — checkout é no Kiwify, outro domínio)
// ID público por natureza (aparece no fonte de qualquer site que anuncia).
// .trim() defensivo: env setada via CLI pode vir com \n no fim (quebraria o send_to).
export const GADS_ID = (process.env.NEXT_PUBLIC_GADS_ID || "AW-11337182960").trim();

export default function GoogleAdsTag() {
  if (!GADS_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gads-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GADS_ID}', { allow_enhanced_conversions: true });
        `}
      </Script>
    </>
  );
}
