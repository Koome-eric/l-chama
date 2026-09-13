import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],

  content: ["./src/**/*.{ts,tsx}"],

  theme: {
    container: {
      center: true,
      padding: "1rem",
    },

    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        chama: {
          DEFAULT: "hsl(var(--chama-green))",
          foreground: "hsl(var(--chama-green-foreground))",
        },

        // Registered as a real theme color (not just the hand-rolled
        // .text-gold/.bg-gold utilities in globals.css) so every Tailwind
        // color utility variant — fill-gold, stroke-gold/40, border-gold/40,
        // from-gold/5, etc. — works, not just the couple of classes that
        // happened to be hand-written.
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        headline: ["var(--font-headline)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },

  plugins: [tailwindcssAnimate],
};

export default config;