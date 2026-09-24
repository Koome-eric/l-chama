import type { Metadata } from "next";
import { Manrope, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { clerkLocalization } from "@/lib/clerk-localization";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Runs before React hydrates, straight from the server-rendered HTML, so
// the correct theme class is on <html> before first paint — no light-mode
// flash for users who've chosen (or whose system prefers) dark. Kept as a
// plain string so it can't accidentally depend on any bundled module.
const THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage.getItem('lchama-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}else{document.documentElement.style.colorScheme='light'}}catch(e){}})()`;

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
    "L-Chama is a community-centric fintech platform that digitizes informal banking systems, enhances contribution management, and streamlines group lending mechanisms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={clerkLocalization as any}>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        </head>
        <body className="font-sans antialiased">
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
