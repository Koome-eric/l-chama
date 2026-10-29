import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
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

// Plus Jakarta Sans for headlines: a geometric sans with open, confident
// letterforms common in modern fintech. Inter stays for body copy and figures
// (excellent tabular numerals for money). The two are loaded as CSS variables
// and mapped to Tailwind's font-headline / font-sans in tailwind.config.ts.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

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
        className={`${inter.variable} ${jakarta.variable}`}
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
