import type { Metadata } from "next";
import { Manrope, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

// Space Grotesk carries the headline personality — a geometric grotesk
// with just enough character to feel like a fintech product rather than
// a generic SaaS template. Manrope is the body face: humanist and warm,
// so the chama's community feel isn't lost under the financial chrome.
// JetBrains Mono is reserved specifically for money figures and ledger
// data (balances, ROI, repayment tables) — tabular numerals give every
// KES amount the precision of a bank statement.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-headline" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "L-CHAMA — Save Together, Borrow Together",
  description:
    "Start a chama, invite your members, and manage a shared loan account guaranteed by your own people.",
  icons: {
    icon: "/lchama-logo-v3.png",
    shortcut: "/lchama-logo-v3.png",
    apple: "/lchama-logo-v3.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      >
        <body className="font-sans antialiased">
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
