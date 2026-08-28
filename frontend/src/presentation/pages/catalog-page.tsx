import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Material } from '@domain/entities/material';
import type { TranslationKey } from '@application/i18n/translations';
import { useTranslation } from '@application/i18n/i18n-context';
import { useCurrency } from '@application/currency/currency-context';
import { materialLabel, shapeLabelKey } from '@application/i18n/catalog-labels';
import { Header } from '@presentation/components/header';
import { SiteFooter } from '@presentation/components/site-footer';
import { LazyMonumentViewer } from '@presentation/components/lazy-monument-viewer';
import {
  DEFAULT_INSCRIPTION_STYLE_ID,
  getInscriptionStyle
} from '@presentation/components/inscription-styles';
import { DEFAULT_PORTRAIT_CROP, SAMPLE_PORTRAIT_URL } from '@presentation/three/photo-crop';
import { SELECTABLE_MONUMENT_SHAPES, type MonumentShape } from '@domain/entities/monument';
import { monumentPriceByn, SHAPE_BASE_PRICE_BYN } from '@application/pricing/monument-price';

interface CatalogPageProps {
  materials: Material[];
}

const CATALOG_STELA = { heightCm: 100, widthCm: 60, thicknessCm: 10 };
const CATALOG_BASE = { heightCm: 20, widthCm: 60, depthCm: 15 };

/** One card per purchasable silhouette. Preview uses the default standard size.
 *  Derived from the same list the designer validates `?shape=` against, so every
 *  card here is guaranteed to survive the jump into the configurator. */
const CATALOG_SHAPES: {
  shape: MonumentShape;
  labelKey: TranslationKey;
}[] = SELECTABLE_MONUMENT_SHAPES.map((shape) => ({
  shape,
  labelKey: shapeLabelKey(shape)
}));

export const CatalogPage = ({ materials }: CatalogPageProps) => {
  const { t } = useTranslation();
  const { formatFromByn } = useCurrency();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id ?? '');

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId) ?? materials[0];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <Header />

      <main className="flex-1">
        <div className="bg-surface">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 lg:py-16">
            <h1 className="u-display text-4xl text-ink sm:text-5xl">{t('catalog.title')}</h1>
            <p className="mt-4 max-w-prose text-ink-2">{t('catalog.subtitle')}</p>
          </div>
        </div>

        {/* Choosing the stone re-renders every preview below, so it stays
            pinned under the header rather than scrolling away from its effect. */}
        {materials.length > 0 && (
          <div className="sticky top-16 z-10 border-b border-line bg-canvas/90 shadow-raised backdrop-blur">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6">
              <p className="u-label mb-3">{t('catalog.material.label')}</p>
              <div className="u-scroll-none u-fade-e flex gap-2 overflow-x-auto pb-1">
                {materials.map((m) => {
                  const active = m.id === selectedMaterialId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMaterialId(m.id)}
                      aria-pressed={active}
                      className={[
                        'u-chip flex shrink-0 items-center gap-2 px-3 py-2 text-sm',
                        active ? 'u-chip-active' : ''
                      ].join(' ')}
                    >
                      <img
                        src={m.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-6 w-6 object-cover"
                      />
                      <span>{materialLabel(m.name, t)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 lg:py-16">
          {materials.length === 0 ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Skeletons take the shape of the card they stand in for, so
                  the grid does not reflow when the previews arrive. */}
              {CATALOG_SHAPES.map(({ shape }) => (
                <div key={shape} aria-hidden="true">
                  <div className="u-skeleton h-80 w-full" />
                  <div className="u-skeleton mt-4 h-5 w-2/3" />
                  <div className="u-skeleton mt-2 h-4 w-1/3" />
                </div>
              ))}
              <p className="sr-only">{t('catalog.loading')}</p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {CATALOG_SHAPES.map(({ shape, labelKey }) => {
                const dimensions = CATALOG_STELA;
                const materialPrice = selectedMaterial
                  ? monumentPriceByn(selectedMaterial.pricePerM2, dimensions, shape)
                  : SHAPE_BASE_PRICE_BYN[shape];

                return (
                  <article key={shape} className="group flex flex-col">
                    <div className="border border-line bg-surface">
                      {/* Live configurator render, reacting to the stone above. */}
                      <LazyMonumentViewer
                        variant="compact"
                        deferUntilVisible
                        rootMargin="-80px 0px"
                        heightClassName="h-80"
                        frameloop="demand"
                        layout="single"
                        label={t('catalog.previewLoading')}
                        textureUrl={selectedMaterial?.imageUrl}
                        materialName={selectedMaterial?.name}
                        finish="Polished"
                        dimensions={dimensions}
                        baseDimensions={CATALOG_BASE}
                        inscription={t('designer.presets.classic.inscription')}
                        name={t('designer.presets.classic.name')}
                        dates={t('designer.presets.classic.dates')}
                        inscriptionStyle={getInscriptionStyle(DEFAULT_INSCRIPTION_STYLE_ID).three}
                        shape={shape}
                        decoration="portrait"
                        nicheStyle="recessed"
                        photoUrl={SAMPLE_PORTRAIT_URL}
                        photoCrop={DEFAULT_PORTRAIT_CROP}
                        photoBlend={0.08}
                        photoBrightness={0}
                        photoContrast={1.3}
                      />
                    </div>

                    <div className="mt-5 flex flex-1 flex-col">
                      <h2 className="u-display text-xl text-ink">{t(labelKey)}</h2>

                      {selectedMaterial && (
                        <p className="mt-2 text-sm text-ink-2">
                          {materialLabel(selectedMaterial.name, t)}
                          {', '}
                          {t('catalog.basePriceFrom', {
                            price: formatFromByn(materialPrice, { digits: 2 })
                          })}
                        </p>
                      )}

                      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-3">
                        {t('catalog.shapeTagline')}
                      </p>

                      <Link
                        to={`/design?shape=${shape}`}
                        className="u-btn u-btn-secondary mt-5 w-full py-3 group-hover:border-brand group-hover:text-brand"
                      >
                        {t('catalog.designCta')}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <SiteFooter note={t('catalog.footer')} />
    </div>
  );
};
