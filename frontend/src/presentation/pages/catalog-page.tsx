import type { Material } from '@domain/entities/material';
import { FeaturedMaterials } from '@presentation/components/featured-materials';
import { Header } from '@presentation/components/header';

interface CatalogPageProps {
  materials: Material[];
}

export const CatalogPage = ({ materials }: CatalogPageProps) => {
  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <main>
        <FeaturedMaterials materials={materials} />
      </main>
      <footer className="mx-auto mt-12 w-full max-w-6xl px-6 pb-10 text-xs text-slate-500">
        Signature Stone - memorial catalog.
      </footer>
    </div>
  );
};
