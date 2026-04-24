import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "ATB Tarot",
  description: "Consulte ATB, sua Tarologa",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: "#2a0050", color: "#fff", border: "1px solid #d4af37" },
          }}
        />
      </body>
    </html>
  );
}
