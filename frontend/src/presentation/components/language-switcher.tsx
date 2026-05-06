import { Globe } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import {
  LANGUAGE_SHORT,
  SUPPORTED_LANGUAGES,
  type Language
} from '@application/i18n/translations';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
}

export const LanguageSwitcher = ({ variant = 'default' }: LanguageSwitcherProps) => {
  const { language, setLanguage, t } = useTranslation();

  const isCompact = variant === 'compact';

  return (
    <div
      className={[
        'inline-flex items-center gap-1 rounded-md border border-slate-700 p-0.5 text-xs',
        isCompact ? 'bg-transparent' : 'bg-slate-900/60'
      ].join(' ')}
      role="group"
      aria-label={t('header.language')}
    >
      {!isCompact ? (
        <Globe className="ml-1 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
      ) : null}
      {SUPPORTED_LANGUAGES.map((lang: Language) => {
        const isActive = lang === language;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            aria-pressed={isActive}
            className={[
              'rounded px-2 py-1 font-medium transition',
              isActive
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            ].join(' ')}
          >
            {LANGUAGE_SHORT[lang]}
          </button>
        );
      })}
    </div>
  );
};
