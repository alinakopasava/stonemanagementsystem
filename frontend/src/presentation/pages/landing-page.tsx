import type { Material } from '@domain/entities/material';
import { products } from '@infrastructure/data/catalog-data';
import { ConfiguratorWidget } from '@presentation/components/configurator-widget';
import { Header } from '@presentation/components/header';
import { HeroSection } from '@presentation/components/hero-section';

interface LandingPageProps {
  materials: Material[];
}

export const LandingPage = ({ materials }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <main>
        <HeroSection />
        <ConfiguratorWidget materials={materials} product={products[0]} />
      </main>
      <footer className="mx-auto mt-12 w-full max-w-6xl px-6 pb-10 text-xs text-slate-500">
        Signature Stone - dignified memorial craftsmanship in a modern digital process.
      </footer>
    </div>
  );
};
