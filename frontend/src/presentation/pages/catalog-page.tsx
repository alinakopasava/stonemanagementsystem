import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Material } from '@domain/entities/material';
import type { TranslationKey } from '@application/i18n/translations';
import { useTranslation } from '@application/i18n/i18n-context';
import { useCurrency } from '@application/currency/currency-context';
import { materialLabel } from '@application/i18n/catalog-labels';
import { Header } from '@presentation/components/header';
import { LazyMonumentViewer } from '@presentation/components/lazy-monument-viewer';
import { DEFAULT_PORTRAIT_CROP, SAMPLE_PORTRAIT_URL } from '@presentation/three/photo-crop';
import type { MonumentShape } from '@presentation/three/monument-model';
import { monumentPriceByn, SHAPE_BASE_PRICE_BYN } from '@application/pricing/monument-price';

interface CatalogPageProps {
  materials: Material[];
}

const CATALOG_WIDTH_CM = 90;

/** Every existing monument silhouette gets its own card. `aspect` = intended H/W ratio
 *  (mirrors the designer's tuning). Price uses the shared catalog/designer formula. */
const CATALOG_SHAPES: {
  shape: MonumentShape;
  labelKey: TranslationKey;
  aspect: number;
}[] = [
  { shape: 'classic', labelKey: 'designer.shape.classic', aspect: 2.0 },
  { shape: 'rounded', labelKey: 'designer.shape.rounded', aspect: 2.0 },
  { shape: 'stele', labelKey: 'designer.shape.stele', aspect: 2.2 },
  { shape: 'concave', labelKey: 'designer.shape.concave', aspect: 2.0 },
  { shape: 'asymmetric', labelKey: 'designer.shape.asymmetric', aspect: 2.6 },
  { shape: 'wave-steep', labelKey: 'designer.shape.waveSteep', aspect: 2.1 },
  { shape: 'curvy', labelKey: 'designer.shape.curvy', aspect: 2.2 },
  { shape: 'dome', labelKey: 'designer.shape.dome', aspect: 2.6 },
  { shape: 'arc', labelKey: 'designer.shape.arc', aspect: 2.25 },
  { shape: 'cross-top', labelKey: 'designer.shape.crossTop', aspect: 2.6 },
  { shape: 'gothic', labelKey: 'designer.shape.gothic', aspect: 2.3 },
  { shape: 'cross', labelKey: 'designer.shape.cross', aspect: 2.4 },
  { shape: 'heart', labelKey: 'designer.shape.heart', aspect: 1.7 }
];

export const CatalogPage = ({ materials }: CatalogPageProps) => {
  const { t } = useTranslation();
  const { formatFromByn } = useCurrency();
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
                      alt={materialLabel(m.name, t)}
                      loading="lazy"
                      decoding="async"
                      className="h-5 w-5 rounded-sm object-cover"
                    />
                    <span>{materialLabel(m.name, t)}</span>
                    <span className={active ? 'text-amber-300/80' : 'text-slate-500'}>
                      {t('catalog.priceFrom', { price: formatFromByn(m.pricePerM2) })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Shape grid — one live configurator preview per existing silhouette */}
        {materials.length === 0 ? (
          <p className="py-20 text-center text-slate-400">{t('catalog.loading')}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG_SHAPES.map(({ shape, labelKey, aspect }) => {
              const dimensions = {
                widthCm: CATALOG_WIDTH_CM,
                heightCm: Math.round(CATALOG_WIDTH_CM * aspect),
                thicknessCm: 15
              };
              const materialPrice = selectedMaterial
                ? monumentPriceByn(selectedMaterial.pricePerM2, dimensions, shape)
                : SHAPE_BASE_PRICE_BYN[shape];

              return (
                <article
                  key={shape}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 transition hover:border-slate-500/80"
                >
                  <div className="relative">
                    {/* Live configurator render — reacts to the selected material. */}
                    <LazyMonumentViewer
                      variant="compact"
                      deferUntilVisible
                      rootMargin="-80px 0px"
                      heightClassName="h-72"
                      frameloop="demand"
                      layout="single"
                      label={t('catalog.previewLoading')}
                      textureUrl={selectedMaterial?.imageUrl}
                      materialName={selectedMaterial?.name}
                      finish="Polished"
                      dimensions={dimensions}
                      inscription=""
                      name={t('designer.presets.classic.name')}
                      dates={t('designer.presets.classic.dates')}
                      shape={shape}
                      decoration="portrait"
                      nicheStyle="recessed"
                      photoUrl={SAMPLE_PORTRAIT_URL}
                      photoCrop={DEFAULT_PORTRAIT_CROP}
                      photoBlend={0.08}
                      photoBrightness={0}
                      photoContrast={1.3}
                    />
                    {selectedMaterial && (
                      <div className="pointer-events-none absolute bottom-2 left-2 z-[2] rounded-md bg-slate-950/75 px-3 py-1.5 backdrop-blur-sm">
                        <p className="text-[11px] text-slate-300">
                          {materialLabel(selectedMaterial.name, t)}
                        </p>
                        <p className="font-serif text-base text-amber-200">
                          {t('catalog.basePriceFrom', {
                            price: formatFromByn(materialPrice, { digits: 2 })
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-serif text-xl text-gray-100">{t(labelKey)}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                      {t('catalog.shapeTagline')}
                    </p>
                    <Link
                      to={`/design?shape=${shape}`}
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
