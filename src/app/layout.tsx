import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProDevis Vitres | Application de chiffrage",
  description: "Créez facilement vos devis de nettoyage de vitres.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ProDevis Vitres",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { BottomNav } from "@/components/BottomNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased min-h-[100dvh] bg-slate-50 flex flex-col`}>
        <div className="flex-1 overflow-y-auto pb-16">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
