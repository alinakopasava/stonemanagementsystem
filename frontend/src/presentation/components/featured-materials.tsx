import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Material } from '@domain/entities/material';
import { useTranslation } from '@application/i18n/i18n-context';
import { useCurrency } from '@application/currency/currency-context';
import { categoryLabel, materialLabel } from '@application/i18n/catalog-labels';

interface FeaturedMaterialsProps {
  materials: Material[];
}

/**
 * Thirteen stones is too many for a grid of equal cards and too few to bury
 * behind a filter, so they run as one horizontal track.
 *
 * The native scrollbar is hidden here rather than restyled. A partially
 * styled webkit scrollbar is worse than none: Chromium reads any
 * ::-webkit-scrollbar rule as "this bar is custom now" and starts drawing
 * the stepper arrows it otherwise hides. The track carries its own controls
 * instead, which also gives keyboard and touch users something the bar never
 * offered.
 */
export const FeaturedMaterials = ({ materials }: FeaturedMaterialsProps) => {
  const { t } = useTranslation();
  const { formatFromByn } = useCurrency();
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /** Which controls are live depends on where the track is sitting. */
  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncEdges();
    el.addEventListener('scroll', syncEdges, { passive: true });
    // The track's reach changes with the viewport, not only with scrolling.
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

  if (materials.length === 0) return null;

  return (
    <section className="bg-surface py-16 sm:py-24" id="catalog">
      <div className="mx-auto flex w-full max-w-[1400px] items-end justify-between gap-8 px-4 sm:px-6">
        <div>
          <h2 className="u-display text-3xl text-ink sm:text-4xl">{t('catalog.title')}</h2>
          <p className="mt-3 max-w-prose text-ink-2">{t('catalog.subtitle')}</p>
        </div>

        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label={t('featured.scrollPrev')}
            className="u-btn u-btn-secondary h-11 w-11 p-0"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label={t('featured.scrollNext')}
            className="u-btn u-btn-secondary h-11 w-11 p-0"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        className={[
          'u-scroll-none mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-pl-4 px-4 pb-2 sm:scroll-pl-6 sm:px-6 lg:mx-auto lg:max-w-[1400px]',
          // The faded edge is the "more this way" cue, so it retracts once
          // there is nothing further to reach.
          atEnd ? '' : 'u-fade-e'
        ].join(' ')}
        aria-label={t('catalog.title')}
      >
        {materials.map((material) => (
          <li key={material.id} className="w-[15rem] shrink-0 snap-start sm:w-[17rem]">
            <Link to="/catalog" className="group block">
              <img
                src={material.imageUrl}
                alt={t('featured.imageAlt', { name: materialLabel(material.name, t) })}
                loading="lazy"
                decoding="async"
                width={544}
                height={680}
                className="aspect-[4/5] w-full object-cover transition-opacity group-hover:opacity-90"
              />
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-xs text-ink-3">{categoryLabel(material.category, t)}</p>
                <h3 className="mt-1 u-display text-lg text-ink transition-colors group-hover:text-brand">
                  {materialLabel(material.name, t)}
                </h3>
                <p className="mt-1 text-sm text-ink-2">
                  {t('catalog.priceFrom', {
                    price: formatFromByn(material.pricePerM2, { digits: 2 })
                  })}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
