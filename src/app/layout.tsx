import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

export const metadata: Metadata = {
  title: "ATB Tarot",
  description: "Consulte ATB, sua Tarologa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <I18nProvider>
          {children}
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
