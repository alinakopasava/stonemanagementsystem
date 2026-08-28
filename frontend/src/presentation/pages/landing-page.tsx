import type { Material } from '@domain/entities/material';
import { useTranslation } from '@application/i18n/i18n-context';
import { ContactForm } from '@presentation/components/contact-form';
import { FeaturedMaterials } from '@presentation/components/featured-materials';
import { Header } from '@presentation/components/header';
import { HeroSection } from '@presentation/components/hero-section';
import { MottoBand } from '@presentation/components/motto-band';
import { SiteFooter } from '@presentation/components/site-footer';

interface LandingPageProps {
  materials: Material[];
}

/**
 * Four sections, four different layout families: an asymmetric split, a
 * horizontal track, a full-bleed statement, and a form. The stone gallery had
 * been built but never mounted, so the storefront was showing none of its
 * thirteen materials.
 */
export const LandingPage = ({ materials }: LandingPageProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <Header />
      <main className="flex-1">
        <HeroSection materials={materials} />
        <FeaturedMaterials materials={materials} />
        <MottoBand />
        <ContactForm />
      </main>
      <SiteFooter note={t('landing.footer')} contactHref="#contact" />
    </div>
  );
};
