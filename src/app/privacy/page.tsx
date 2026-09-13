import { ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';

export const metadata = {
  title: 'Privacy Policy — L-Chama',
};

const SECTIONS = [
  { id: 'information-we-collect', label: '1. Information We Collect' },
  { id: 'purpose-of-collection', label: '2. Purpose & Usage' },
  { id: 'limitation-of-use', label: '3. Limitation of Data Use' },
  { id: 'data-protection', label: '4. Data Protection & Security' },
  { id: 'your-rights', label: '5. Your Rights' },
  { id: 'contact-us', label: '6. Contact Us' },
];

/* ────────────────────────────────────────────────────────────── */
/*  Public, no-sign-in-required page — linked from the landing page  */
/*  footer, navbar, and sign-up. Content sourced verbatim from the   */
/*  Privacy Policy doc provided by Ludeva/L-Chama; only structure    */
/*  and presentation are new.                                       */
/* ────────────────────────────────────────────────────────────── */

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LChamaHeader />

      <main className="flex-1">
        {/* Hero band */}
        <div className="border-b bg-gradient-to-br from-primary/10 via-background to-gold/5">
          <div className="container mx-auto px-4 lg:px-6 py-14 lg:py-20 max-w-4xl">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-5">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-headline text-4xl sm:text-5xl font-bold">Privacy Policy</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
              Welcome to L-Chama. We value your trust and are committed to protecting your personal data and
              privacy. This policy explains how we collect, use, disclose, and protect the personal information of
              members and administrators using our platform.
            </p>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
              By registering for an account or using the L-Chama platform, you agree to the collection and use of
              information in accordance with this policy and applicable data protection laws.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 lg:px-6 py-12 lg:py-16 max-w-4xl grid lg:grid-cols-[220px_1fr] gap-12">
          {/* Table of contents — sticky on desktop */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1 text-sm">
              <p className="font-headline font-semibold text-foreground mb-3">On this page</p>
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block py-1.5 text-muted-foreground hover:text-primary transition-colors border-l-2 border-transparent hover:border-primary pl-3 -ml-px"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="space-y-14 min-w-0">
            <section id="information-we-collect" className="space-y-3 scroll-mt-24">
              <h2 className="font-headline text-2xl font-semibold">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                To provide seamless financial management and administrative services for your chama, we collect
                specific personal identification details from members, including:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
                <li>National Identification Number / Passport Number</li>
                <li>Full Name &amp; Contact Email Address</li>
                <li>Physical &amp; Residential Address</li>
                <li>Mobile Phone Number</li>
              </ul>
            </section>

            <section id="purpose-of-collection" className="space-y-3 scroll-mt-24">
              <h2 className="font-headline text-2xl font-semibold">2. Purpose of Collection and Usage</h2>
              <p className="text-muted-foreground">
                L-Chama collects and uses member information strictly to perform platform operations and fulfill
                financial and administrative duties. Specifically, your data is used to:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                <li>
                  <strong className="text-foreground">Verify Identity &amp; Enforce KYC:</strong> Authenticate
                  members to prevent identity theft, unauthorized account access, and fraudulent financial
                  activities.
                </li>
                <li>
                  <strong className="text-foreground">Facilitate Financial Transactions:</strong> Process
                  merry-go-round distributions, loan applications, contribution tracking, and mobile money payouts
                  (e.g., M-Pesa / Bank transfers).
                </li>
                <li>
                  <strong className="text-foreground">Maintain Auditable Records:</strong> Generate accurate
                  individual member statements, contribution histories, and group ledgers.
                </li>
                <li>
                  <strong className="text-foreground">Provide Communication &amp; Alerts:</strong> Send
                  transactional notifications, payment receipts, system alerts, loan reminders, and account security
                  notices via SMS or email.
                </li>
                <li>
                  <strong className="text-foreground">Legal &amp; Contractual Obligations:</strong> Establish legal
                  enforceability for credit agreements, micro-loans, and group constitutions managed on the
                  platform.
                </li>
              </ul>
            </section>

            <section id="limitation-of-use" className="space-y-3 scroll-mt-24">
              <h2 className="font-headline text-2xl font-semibold">3. Strict Limitation of Data Use</h2>
              <p className="text-muted-foreground">
                Your personal details are strictly for L-Chama company operations and your registered chama's
                internal management.
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                <li>
                  <strong className="text-foreground">No Data Selling or Renting:</strong> L-Chama does not sell,
                  rent, trade, or lease member data to third parties, advertising networks, or external marketers
                  under any circumstances.
                </li>
                <li>
                  <strong className="text-foreground">Authorized Access Only:</strong> Access to member data is
                  strictly restricted to authorized system processes and designated officials (e.g., elected Chama
                  Treasurers/Chairs) approved by your specific group.
                </li>
                <li>
                  <strong className="text-foreground">Third-Party Service Providers:</strong> Information is shared
                  with third-party vendors (such as telecom payment gateways or SMS infrastructure providers) solely
                  to the extent necessary to complete your requested transactions. These partners are bound by
                  strict non-disclosure and security agreements.
                </li>
              </ul>
            </section>

            <section id="data-protection" className="space-y-3 scroll-mt-24">
              <h2 className="font-headline text-2xl font-semibold">4. Data Protection and Security</h2>
              <p className="text-muted-foreground">
                We employ industry-standard technical and organizational security measures to protect your personal
                data, including:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                <li>
                  <strong className="text-foreground">Encryption:</strong> Data in transit is encrypted using Secure
                  Sockets Layer (SSL/TLS) technology, and sensitive data at rest is stored using advanced encryption
                  protocols.
                </li>
                <li>
                  <strong className="text-foreground">Access Controls:</strong> Strict multi-factor authentication
                  (MFA) and role-based access permissions prevent unauthorized internal or external access.
                </li>
                <li>
                  <strong className="text-foreground">Regular Audits:</strong> Continuous monitoring and
                  vulnerability assessments to safeguard systems against potential cyber threats.
                </li>
              </ul>
            </section>

            <section id="your-rights" className="space-y-3 scroll-mt-24">
              <h2 className="font-headline text-2xl font-semibold">5. Your Rights</h2>
              <p className="text-muted-foreground">
                Subject to applicable data protection legislation, you reserve the right to:
              </p>
              <ol className="list-decimal pl-5 text-muted-foreground space-y-2">
                <li>Access and request a copy of the personal information L-Chama holds about you.</li>
                <li>Request corrections to inaccurate or outdated personal details.</li>
                <li>
                  Request the deletion or restriction of your data, provided there are no pending legal or financial
                  liabilities tied to your account within your group.
                </li>
              </ol>
            </section>

            <section id="contact-us" className="scroll-mt-24 rounded-2xl border bg-card p-6 sm:p-8 space-y-4">
              <h2 className="font-headline text-2xl font-semibold">6. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions, concerns, or requests regarding this Privacy Policy or how L-Chama manages
                your data, please reach out to our privacy team at:
              </p>
              <div className="space-y-2.5 text-sm">
                <a href="mailto:lchama@ludevaplc.co.ke" className="flex items-center gap-2.5 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary shrink-0" /> lchama@ludevaplc.co.ke
                </a>
                <a href="tel:+254732722101" className="flex items-center gap-2.5 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-primary shrink-0" /> Customer Support: 0732 722101 / +254 733 799640
                </a>
                <p className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  L-Chama Technologies / Ludeva Plc, Legacy Plaza, Homabay Town, P.O. Box 596-40300
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <LChamaFooter />
    </div>
  );
}
