import { Mail, Phone, MapPin, UserRound, Clock } from 'lucide-react';
import LChamaHeader from '@/components/LChamaHeader';
import LChamaFooter from '@/components/LChamaFooter';
import { ContactHeroArt } from '@/components/ContactHeroArt';
import { HeroReveal, HeroRevealItem } from '@/components/motion/HeroReveal';
import { Button } from '@/components/ui/button';
import { ContactForm } from './ContactForm';

export const metadata = {
  title: 'Contact — L-Chama',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LChamaHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 lg:px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <HeroReveal>
            <HeroRevealItem>
              <h1 className="font-headline text-4xl sm:text-5xl font-bold leading-tight">
                Your chama's questions,<br />answered by real people.
              </h1>
            </HeroRevealItem>
            <HeroRevealItem className="mt-5">
              <p className="text-lg text-muted-foreground max-w-md">
                Whether you're setting up your first chama or need a hand with a withdrawal, the L-Chama team is a
                call or message away.
              </p>
            </HeroRevealItem>
            <HeroRevealItem className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <a href="tel:+254733799640">
                  <Phone className="h-4 w-4" /> Call the Helpline
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <a href="mailto:lchama@ludevaplc.co.ke">
                  <Mail className="h-4 w-4" /> Email us
                </a>
              </Button>
            </HeroRevealItem>
          </HeroReveal>

          <HeroReveal>
            <HeroRevealItem>
              <ContactHeroArt className="w-full max-w-md mx-auto" />
            </HeroRevealItem>
          </HeroReveal>
        </section>

        {/* Form + direct lines */}
        <section className="container mx-auto px-4 lg:px-6 pb-20 grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 rounded-2xl border bg-card p-6 sm:p-8">
            <h2 className="font-headline text-2xl font-semibold mb-1">Send us a message</h2>
            <p className="text-sm text-muted-foreground mb-6">We typically reply within one business day.</p>
            <ContactForm />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <a href="mailto:lchama@ludevaplc.co.ke" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    lchama@ludevaplc.co.ke
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-gold/40 bg-gold/5 p-6">
              <div className="flex items-start gap-3">
                <UserRound className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">L-Chama Director</p>
                  <p className="text-sm">Dr Keziah Odemba</p>
                  <a href="mailto:kodemba@ludevaplc.co.ke" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    kodemba@ludevaplc.co.ke
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Phone / Helpline</p>
                  <a href="tel:+254733799640" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                    0733 799 640
                  </a>
                  <a href="tel:+254732722101" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                    0732 722 101
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Diaspora Team Leads</p>
                  <a href="tel:+19199868786" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                    +1 (919) 986-8786
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Office</p>
                  <p className="text-sm text-muted-foreground">
                    L-Chama Technologies / Ludeva Plc<br />
                    Legacy Plaza, Homabay Town<br />
                    P.O. Box 596-40300
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Hours</p>
                  <p className="text-sm text-muted-foreground">Monday – Friday, 8:00 AM – 5:00 PM EAT</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LChamaFooter />
    </div>
  );
}
