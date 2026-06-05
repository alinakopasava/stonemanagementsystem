import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Material } from '@domain/entities/material';
import type { ProductItem } from '@infrastructure/api/product-api';
import { useTranslation } from '@application/i18n/i18n-context';
import { Header } from '@presentation/components/header';

interface CatalogPageProps {
  materials: Material[];
  products: ProductItem[];
}

export const CatalogPage = ({ materials, products }: CatalogPageProps) => {
  const { t } = useTranslation();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id ?? '');

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId) ?? materials[0];

  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">

        {/* Heading */}
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            {t('header.catalog')}
          </p>
          <h1 className="mt-1 font-serif text-4xl text-gray-100">{t('catalog.title')}</h1>
          <p className="mt-2 max-w-2xl text-slate-300">{t('catalog.subtitle')}</p>
        </div>

        {/* Material selector */}
        {materials.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-4">
            <span className="text-sm text-slate-400 shrink-0">
              {t('catalog.material.label')}:
            </span>
            <div className="flex flex-wrap gap-2">
              {materials.map((m) => {
                const active = m.id === selectedMaterialId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMaterialId(m.id)}
                    className={[
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                      active
                        ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-gray-100'
                    ].join(' ')}
                  >
                    <img
                      src={m.imageUrl}
                      alt={m.name}
                      className="h-5 w-5 rounded-sm object-cover"
                    />
                    <span>{m.name}</span>
                    <span className={active ? 'text-amber-300/80' : 'text-slate-500'}>
                      {t('catalog.priceFrom', { price: m.pricePerM2.toFixed(0) })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Product grid */}
        {products.length === 0 ? (
          <p className="py-20 text-center text-slate-400">{t('catalog.loading')}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const areaM2 = 1.8 * 0.9;
              const materialPrice = selectedMaterial
                ? Math.round(product.basePrice + areaM2 * selectedMaterial.pricePerM2)
                : product.basePrice;

              return (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 transition hover:border-slate-500/80"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    {selectedMaterial && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/90 to-transparent px-4 py-3">
                        <p className="text-xs text-slate-400">{selectedMaterial.name}</p>
                        <p className="font-serif text-xl text-amber-200">
                          {t('catalog.basePriceFrom', { price: materialPrice.toLocaleString('pl-PL') })}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-serif text-xl text-gray-100">{product.name}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                      {product.description}
                    </p>
                    <Link
                      to="/design"
                      className="mt-5 block rounded-md bg-gray-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-white"
                    >
                      {t('catalog.designCta')}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mx-auto mt-12 w-full max-w-6xl px-6 pb-10 text-xs text-slate-500">
        {t('catalog.footer')}
      </footer>
    </div>
  );
};
