import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SidebarView } from "@/components/layout/Sidebar";
import { SidebarLoader } from "@/components/layout/SidebarLoader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Scoutly – Prospection d'entreprises",
    template: "%s – Scoutly",
  },
  description: "Recherche et export d'entreprises françaises",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900 md:flex">
        {/* La page active dépend de l'URL : connue à la requête seulement */}
        <Suspense fallback={<SidebarView pathname={null} counts={null} />}>
          <SidebarLoader />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={null}>
            <Breadcrumb />
          </Suspense>
          {children}
        </div>
      </body>
    </html>
  );
}
