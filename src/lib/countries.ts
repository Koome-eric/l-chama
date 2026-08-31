export type CountryOption = {
  code: string; // ISO-ish short code used as the form value
  name: string;
  flag: string;
  dialCode: string;
};

export const COUNTRIES: CountryOption[] = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', dialCode: '+256' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dialCode: '+255' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', dialCode: '+250' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', dialCode: '+251' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dialCode: '+27' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', dialCode: '+212' },
  { code: 'US', name: 'USA', flag: '🇺🇸', dialCode: '+1' },
  { code: 'GB', name: 'UK', flag: '🇬🇧', dialCode: '+44' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', dialCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61' },
];

// Regions/counties — only Kenya's 47 counties are needed for the
// onboarding form per the mockup; other countries fall back to a free
// text field for "Region/County".
export const KENYA_COUNTIES: string[] = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Machakos',
  'Kajiado', 'Kilifi', 'Nyeri', 'Meru', 'Kakamega', 'Kisii', 'Bungoma', 'Kericho',
  'Embu', 'Laikipia', 'Garissa', 'Turkana', 'Migori', 'Homa Bay', 'Siaya', 'Busia',
  'Trans Nzoia', 'Nandi', 'Baringo', 'Elgeyo Marakwet', 'West Pokot', 'Samburu',
  'Isiolo', 'Marsabit', 'Wajir', 'Mandera', 'Tana River', 'Lamu', 'Taita Taveta',
  'Kwale', 'Kitui', 'Makueni', 'Nyandarua', "Murang'a", 'Kirinyaga', 'Tharaka Nithi',
  'Nyamira', 'Bomet', 'Narok', 'Vihiga',
];

export function getCountry(code: string | null | undefined): CountryOption | null {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) ?? null;
}
