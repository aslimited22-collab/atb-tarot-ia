import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { CookieBanner } from "@/components/CookieBanner";
import { AnalyticsWrapper } from "@/components/AnalyticsWrapper";
import AttributionTracker from "@/components/AttributionTracker";
import GoogleAdsTag from "@/components/GoogleAdsTag";
import GoogleAdsFunnelEvents from "@/components/GoogleAdsFunnelEvents";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import GlobalLangSwitcher from "@/components/GlobalLangSwitcher";
import { getServerLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/dict";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

// Mapeia locale interno pro formato BCP 47 esperado em <html lang>
// e em alternates.languages (hreflang).
const HTML_LANG: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es",
  de: "de",
  it: "it",
  ja: "ja",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://atbtartot.com";

export async function generateMetadata(): Promise<Metadata> {
  const locale = getServerLocale();
  const title = translate(locale, "meta.site_title");
  const description = translate(locale, "meta.site_description");

  // hreflang: gera languages map com canonical URL pra cada locale
  // (Next.js renderiza <link rel="alternate" hreflang="..."> automaticamente)
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[HTML_LANG[l]] = `${SITE_URL}/?lang=${l}`;
  }
  languages["x-default"] = SITE_URL;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: SITE_URL,
      languages,
    },
    openGraph: {
      title,
      description,
      locale: HTML_LANG[locale],
      type: "website",
      siteName: "ATB",
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getServerLocale();
  const htmlLang = HTML_LANG[locale];
  return (
    <html lang={htmlLang}>
      <body>
        <I18nProvider>
          {children}
          <GlobalLangSwitcher />
          <StickyMobileCTA />
          <WhatsAppFloat />
          <CookieBanner />
          <AnalyticsWrapper />
          <AttributionTracker />
          <GoogleAdsTag />
          <GoogleAdsFunnelEvents />
          <Toaster
            position="top-center"
            toastOptions={{
              style: { background: "#2a0050", color: "#fff", border: "1px solid #d4af37" },
            }}
          />
        </I18nProvider>
      </body>
    </html>
  );
}
