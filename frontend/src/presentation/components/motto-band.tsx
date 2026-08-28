import { useTranslation } from '@application/i18n/i18n-context';

/**
 * The one full-bleed colour block on the site. The motto used to be buried
 * inside a decorative panel in the hero, where it competed with the value
 * proposition; given a section of its own it does the job it was written for.
 */
export const MottoBand = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-band py-20 sm:py-28">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        <p className="u-display max-w-[22ch] text-3xl leading-[1.2] text-band-ink sm:text-4xl lg:max-w-[26ch] lg:text-5xl">
          {t('hero.motto')}
        </p>
      </div>
    </section>
  );
};
