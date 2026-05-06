import type { Material } from '@domain/entities/material';
import { useTranslation } from '@application/i18n/i18n-context';
import { ContactForm } from '@presentation/components/contact-form';
import { Header } from '@presentation/components/header';
import { HeroSection } from '@presentation/components/hero-section';

interface LandingPageProps {
  materials: Material[];
}

export const LandingPage = ({ materials: _materials }: LandingPageProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <main>
        <HeroSection />
        <ContactForm />
      </main>
      <footer className="mx-auto mt-12 w-full max-w-6xl px-6 pb-10 text-xs text-slate-500">
        {t('landing.footer')}
      </footer>
    </div>
  );
};
