// Brand tokens shared by Ludeva and L-Chama (keep this file identical in both
// repos). They mirror the HSL custom properties in globals.css so third-party
// widgets that can't read CSS variables (Clerk) match the rest of the UI in
// both themes.
export const BRAND_CLERK_VARIABLES = {
  light: {
    colorBackground: 'hsl(0, 0%, 100%)',
    colorText: 'hsl(224, 71%, 4%)',
    colorTextSecondary: 'hsl(220, 10%, 40%)',
    colorInputBackground: 'hsl(0, 0%, 100%)',
    colorInputText: 'hsl(224, 71%, 4%)',
    colorPrimary: 'hsl(220, 85%, 55%)',
    colorNeutral: 'hsl(224, 71%, 4%)',
  },
  dark: {
    colorBackground: 'hsl(220, 13%, 11%)',
    colorText: 'hsl(210, 40%, 98%)',
    colorTextSecondary: 'hsl(220, 10%, 60%)',
    colorInputBackground: 'hsl(224, 71%, 4%)',
    colorInputText: 'hsl(210, 40%, 98%)',
    colorPrimary: 'hsl(217.2, 91.2%, 59.8%)',
    colorNeutral: 'hsl(210, 40%, 98%)',
  },
} as const;
