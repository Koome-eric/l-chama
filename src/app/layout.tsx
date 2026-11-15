import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toaster";
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
//
// Both are SELF-HOSTED (variable woff2, latin subset, in ./fonts) rather than
// fetched from Google at build time: next/font/google broke production
// builds when Google started serving font URLs without a file extension
// ("TypeError: Cannot read properties of null (reading '1')" in the font
// loader). Bundled files need no network, so the build can't fail on it.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "L-CHAMA — Save Together, Borrow Together",
  description:
    "L-Chama is a community-centric fintech platform that digitizes informal banking systems, enhances contribution management, and streamlines group lending mechanisms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
