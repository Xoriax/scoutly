import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { MainNav, NavLinks } from "@/components/MainNav";
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
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
            <Link href="/" aria-label="Scoutly – accueil" className="rounded-md">
              {/* SVG local : servi tel quel par next/image, sans optimisation */}
              <Image src="/scoutly-logo.svg" alt="Scoutly" width={140} height={32} priority />
            </Link>
            {/* La page active dépend de l'URL : connue à la requête seulement */}
            <Suspense fallback={<NavLinks pathname={null} />}>
              <MainNav />
            </Suspense>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
