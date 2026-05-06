import type { Material } from '@domain/entities/material';
import { useTranslation } from '@application/i18n/i18n-context';
import { FeaturedMaterials } from '@presentation/components/featured-materials';
import { Header } from '@presentation/components/header';

interface CatalogPageProps {
  materials: Material[];
}

export const CatalogPage = ({ materials }: CatalogPageProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <main>
        <FeaturedMaterials materials={materials} />
      </main>
      <footer className="mx-auto mt-12 w-full max-w-6xl px-6 pb-10 text-xs text-slate-500">
        {t('catalog.footer')}
      </footer>
    </div>
  );
};
