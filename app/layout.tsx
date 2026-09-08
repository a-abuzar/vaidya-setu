import "@/lib/env";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { KioskChromeBoot } from "@/components/kiosk/KioskChromeBoot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700", "800"],
});

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "VaidyaSetu — AYUSH OPD Kiosk",
  description:
    "AI-native voice-first case-taking kiosk for Indian government AYUSH OPDs. Ministry of AYUSH Problem Statement 26047.",
};

/**
 * Detect whether the configured Clerk publishable key looks valid.
 * If not, we skip <ClerkProvider> entirely so the app boots without
 * real Clerk credentials. The doctor route group is also gated by a
 * runtime auth check that treats the same condition as "signed in
 * (demo mode)" so the dashboard remains explorable in development.
 */
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const isBypassed = process.env.CLERK_BYPASS === "true";
const hasClerk = !isBypassed && publishableKey.startsWith("pk_");

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const tree = (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable} ${notoTamil.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <KioskChromeBoot />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );

  if (!hasClerk) {
    // Render without ClerkProvider so the app boots without real keys.
    return tree;
  }

  // Lazy import Clerk so it isn't loaded at all when bypassed.
  const { ClerkProvider } = await import("@clerk/nextjs");
  return <ClerkProvider>{tree}</ClerkProvider>;
}