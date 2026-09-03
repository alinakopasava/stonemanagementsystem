import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { withFeaturedFirst, type Material } from '@domain/entities/material';
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
import { getPhotoEngravingProfile } from '@presentation/three/stone-catalog';
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

export const CatalogPage = ({ materials: unordered }: CatalogPageProps) => {
  const { t } = useTranslation();
  const { formatFromByn } = useCurrency();
  /** The featured stone leads the picker, and the page opens on it. */
  const materials = useMemo(() => withFeaturedFirst(unordered), [unordered]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id ?? '');

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId) ?? materials[0];
  /** Engraving settings follow the chosen slab, as the lettering colours do. */
  const photoProfile = getPhotoEngravingProfile(selectedMaterial?.name);

  /*
   * The stone chips run wider than the bar on every viewport, and the bar
   * hides its scrollbar. Without controls of its own the row was reachable
   * only by a trackpad swipe or shift+wheel: a mouse wheel scrolls the page,
   * not the track, so the stones past the fade could not be reached at all.
   * Same treatment as the track on the home page.
   */
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    // A track that fits needs neither arrows nor a faded edge.
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncEdges();
    el.addEventListener('scroll', syncEdges, { passive: true });
    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', syncEdges);
      observer.disconnect();
    };
  }, [syncEdges, materials.length]);

  const nudge = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * Math.round(el.clientWidth * 0.8),
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  };

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
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="u-label">{t('catalog.material.label')}</p>
                {!(atStart && atEnd) && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => nudge(-1)}
                      disabled={atStart}
                      aria-label={t('featured.scrollPrev')}
                      className="u-btn u-btn-secondary h-9 w-9 p-0"
                    >
                      <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => nudge(1)}
                      disabled={atEnd}
                      aria-label={t('featured.scrollNext')}
                      className="u-btn u-btn-secondary h-9 w-9 p-0"
                    >
                      <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
              <div
                ref={trackRef}
                className={[
                  'u-scroll-none flex gap-2 overflow-x-auto pb-1',
                  atEnd ? '' : 'u-fade-e'
                ].join(' ')}
              >
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
            /*
             * An empty catalogue, not a loading one.
             *
             * This page only mounts once the stone list has arrived — until
             * then the router shows the application's own boot screen — so an
             * empty array here means the catalogue really is empty. It used to
             * render loading skeletons, which left a customer watching an
             * animation that would never resolve.
             */
            <div
              role="status"
              className="border border-line bg-surface px-6 py-16 text-center"
            >
              <p className="text-lg text-ink-2">{t('catalog.empty')}</p>
              <p className="mt-2 text-sm text-ink-3">{t('catalog.emptyHint')}</p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {CATALOG_SHAPES.map(({ shape, labelKey }) => {
                const dimensions = CATALOG_STELA;
                const materialPrice = selectedMaterial
                  ? monumentPriceByn({
                      pricePerM2: selectedMaterial.pricePerM2,
                      stela: dimensions,
                      shape,
                      finish: 'Polished',
                      base: CATALOG_BASE,
                      slab: { variant: 'full', thicknessCm: 5 }
                    })
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
                        photoUrl={SAMPLE_PORTRAIT_URL}
                        photoCrop={DEFAULT_PORTRAIT_CROP}
                        photoBlend={photoProfile.blend}
                        photoBrightness={photoProfile.brightness}
                        photoContrast={photoProfile.contrast}
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
