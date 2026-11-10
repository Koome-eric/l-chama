// Where members sign in to their Ludeva account. Set NEXT_PUBLIC_LUDEVA_LOGIN_URL
// to the exact login page; until then it falls back to the Ludeva site.
export const LUDEVA_LOGIN_URL = process.env.NEXT_PUBLIC_LUDEVA_LOGIN_URL || 'https://ludevaplc.co.ke';
