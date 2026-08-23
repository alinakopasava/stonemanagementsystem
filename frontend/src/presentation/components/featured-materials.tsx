import type { Material } from '@domain/entities/material';
import { useTranslation } from '@application/i18n/i18n-context';
import { useCurrency } from '@application/currency/currency-context';
import { categoryLabel, materialLabel } from '@application/i18n/catalog-labels';

interface FeaturedMaterialsProps {
  materials: Material[];
}

export const FeaturedMaterials = ({ materials }: FeaturedMaterialsProps) => {
  const { t } = useTranslation();
  const { formatFromByn } = useCurrency();

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10" id="catalog">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl text-gray-100">{t('catalog.title')}</h2>
          <p className="mt-2 text-slate-300">{t('catalog.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {materials.map((material) => (
          <article
            key={material.id}
            className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/70"
          >
            <img
              src={material.imageUrl}
              alt={t('featured.imageAlt', { name: materialLabel(material.name, t) })}
              className="h-36 w-full object-cover"
            />
            <div className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                {categoryLabel(material.category, t)}
              </p>
              <h3 className="font-serif text-lg text-gray-100">{materialLabel(material.name, t)}</h3>
              <p className="text-sm text-slate-200">
                {t('catalog.priceFrom', { price: formatFromByn(material.pricePerM2, { digits: 2 }) })}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
