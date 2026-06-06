import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wash Up Corp | Application de chiffrage",
  description: "Créez facilement vos devis de nettoyage de vitres.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wash Up Corp",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { BottomNav } from "@/components/BottomNav";
import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-[100dvh] bg-slate-50 flex flex-col font-sans">
        <div className="flex-1 overflow-y-auto pb-16">
          {children}
        </div>
        <Toaster position="top-center" />
        <BottomNav />
      </body>
    </html>
  );
}
