import { useTranslation } from '@application/i18n/i18n-context';
import {
  LANGUAGE_LABELS,
  LANGUAGE_SHORT,
  SUPPORTED_LANGUAGES,
  type Language
} from '@application/i18n/translations';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
}

/**
 * The one full-radius control in the product. Everything else is square,
 * because the shape system is cut stone; a switch is round so it reads as a
 * single track with a moving selection rather than as three loose buttons.
 */
export const LanguageSwitcher = ({ variant = 'default' }: LanguageSwitcherProps) => {
  const { language, setLanguage, t } = useTranslation();

  const isCompact = variant === 'compact';

  return (
    <div
      className={[
        'inline-flex items-center rounded-full border border-line-strong p-0.5',
        isCompact ? 'bg-transparent' : 'bg-surface'
      ].join(' ')}
      role="group"
      aria-label={t('header.language')}
    >
      {SUPPORTED_LANGUAGES.map((lang: Language) => {
        const isActive = lang === language;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            aria-pressed={isActive}
            /* The accessible name stays the code the button shows. The group
               is already labelled "Language", so "PL" is unambiguous read
               aloud, and the full name rides along as the tooltip. */
            title={LANGUAGE_LABELS[lang]}
            className={[
              // Roomier hit area on touch screens; the desktop bar keeps its size.
              'rounded-full px-3 py-2 text-xs font-medium transition-colors sm:px-2.5 sm:py-1',
              isActive
                ? 'bg-brand text-brand-ink'
                : 'text-ink-3 hover:text-ink'
            ].join(' ')}
          >
            {LANGUAGE_SHORT[lang]}
          </button>
        );
      })}
    </div>
  );
};
