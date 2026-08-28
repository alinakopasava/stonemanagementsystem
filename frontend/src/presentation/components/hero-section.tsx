import { Link } from 'react-router-dom';
import type { Material } from '@domain/entities/material';
import { useTranslation } from '@application/i18n/i18n-context';
import {
  DEFAULT_INSCRIPTION_STYLE_ID,
  getInscriptionStyle
} from '@presentation/components/inscription-styles';
import { LazyMonumentViewer } from '@presentation/components/lazy-monument-viewer';

interface HeroSectionProps {
  materials: Material[];
}

const HERO_STELA = { heightCm: 110, widthCm: 60, thicknessCm: 10 };
const HERO_BASE = { heightCm: 20, widthCm: 60, depthCm: 15 };

/**
 * The hero asset is the product itself, rendered live by the same viewer the
 * configurator uses. It replaces a bitmap that had English words baked into
 * the image, so the promise on the page is now the thing being sold rather
 * than a picture of it, and it translates with everything else.
 */
export const HeroSection = ({ materials }: HeroSectionProps) => {
  const { t } = useTranslation();

  const stone =
    materials.find((material) => material.name === 'Gabbro-Diabase') ?? materials[0];

  return (
    <section>
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-12 lg:gap-12 lg:pt-16">
        <div className="lg:col-span-6">
          {/* pb-1 keeps the Polish descenders in "Zaprojektuj" off the
              baseline crop that leading this tight would otherwise cause. */}
          <h1 className="u-display pb-1 text-[2.5rem] leading-[1.08] text-ink sm:text-[3rem] lg:text-[3.25rem]">
            {t('landing.hero.title')}
          </h1>

          <p className="mt-6 max-w-prose text-base leading-relaxed text-ink-2 sm:text-lg">
            {t('landing.hero.subtitle')}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/design" className="u-btn u-btn-primary px-6 py-3.5">
              {t('landing.hero.designerCta')}
            </Link>
            <a href="#contact" className="u-btn u-btn-secondary px-6 py-3.5">
              {t('landing.hero.contactCta')}
            </a>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="border border-line bg-surface">
            <LazyMonumentViewer
              variant="compact"
              /* The viewer's own timeout copy tells the reader to scroll away
                 and back. That is only true when an observer controls
                 mounting, so the hero opts in even though it starts on
                 screen: the margin means it is already intersecting on load,
                 and the retry the message promises actually works. */
              deferUntilVisible
              rootMargin="400px"
              frameloop="demand"
              layout="single"
              heightClassName="h-[380px] sm:h-[480px] lg:h-[600px]"
              label={t('designer.previewLoading')}
              textureUrl={stone?.imageUrl}
              materialName={stone?.name}
              finish="Polished"
              dimensions={HERO_STELA}
              baseDimensions={HERO_BASE}
              inscription={t('designer.presets.classic.inscription')}
              name={t('designer.presets.classic.name')}
              dates={t('designer.presets.classic.dates')}
              inscriptionStyle={getInscriptionStyle(DEFAULT_INSCRIPTION_STYLE_ID).three}
              shape="classic"
              decoration="none"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
