import type { CSSProperties } from 'react';
import { useTranslation } from '@application/i18n/i18n-context';
import type { TranslationKey } from '@application/i18n/translations';

export type InscriptionStyleId =
  | 'roman'
  | 'elegant'
  | 'script'
  | 'classic'
  | 'gothic';

export interface InscriptionStyle {
  id: InscriptionStyleId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  /** CSS for HTML previews (textarea preview + thumbnail). */
  css: CSSProperties;
  /** Hints applied to the 3D engraving. */
  three: {
    /** TTF URL loaded by troika-three-text. Falls back to default if it fails. */
    fontUrl: string;
    letterSpacing: number;
    transform: 'none' | 'uppercase';
    fontScale: number;
  };
}

/** Local font files keep the 3D engraving independent from CDN availability. */
const FONT_PATH = '/fonts';

export const INSCRIPTION_STYLES: InscriptionStyle[] = [
  {
    id: 'roman',
    labelKey: 'inscription.style.roman',
    descriptionKey: 'inscription.style.roman.desc',
    css: {
      fontFamily: '"Cinzel", "Playfair Display", serif',
      fontWeight: 900,
      letterSpacing: '0.18em',
      textTransform: 'uppercase'
    },
    three: {
      fontUrl: `${FONT_PATH}/cinzel-900.woff`,
      letterSpacing: 0.16,
      transform: 'uppercase',
      fontScale: 1
    }
  },
  {
    id: 'classic',
    labelKey: 'inscription.style.classic',
    descriptionKey: 'inscription.style.classic.desc',
    css: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 800,
      letterSpacing: '0.04em'
    },
    three: {
      fontUrl: `${FONT_PATH}/playfair-display-800.woff`,
      letterSpacing: 0.04,
      transform: 'none',
      fontScale: 1
    }
  },
  {
    id: 'elegant',
    labelKey: 'inscription.style.elegant',
    descriptionKey: 'inscription.style.elegant.desc',
    css: {
      fontFamily: '"Cormorant Garamond", serif',
      fontStyle: 'italic',
      fontWeight: 700,
      letterSpacing: '0.02em'
    },
    three: {
      fontUrl: `${FONT_PATH}/cormorant-garamond-700-italic.woff`,
      letterSpacing: 0.02,
      transform: 'none',
      fontScale: 1.22
    }
  },
  {
    id: 'script',
    labelKey: 'inscription.style.script',
    descriptionKey: 'inscription.style.script.desc',
    css: {
      fontFamily: '"Great Vibes", cursive',
      fontWeight: 400,
      letterSpacing: '0.01em'
    },
    three: {
      fontUrl: `${FONT_PATH}/great-vibes-400.woff`,
      letterSpacing: 0.01,
      transform: 'none',
      fontScale: 1.45
    }
  },
  {
    id: 'gothic',
    labelKey: 'inscription.style.gothic',
    descriptionKey: 'inscription.style.gothic.desc',
    css: {
      fontFamily: '"UnifrakturMaguntia", serif',
      fontWeight: 400,
      letterSpacing: '0.04em'
    },
    three: {
      fontUrl: `${FONT_PATH}/unifrakturmaguntia-400.woff`,
      letterSpacing: 0.04,
      transform: 'none',
      fontScale: 1.28
    }
  }
];

export const DEFAULT_INSCRIPTION_STYLE_ID: InscriptionStyleId = 'roman';

export const getInscriptionStyle = (id: InscriptionStyleId) =>
  INSCRIPTION_STYLES.find((s) => s.id === id) ?? INSCRIPTION_STYLES[0];

interface InscriptionStylePickerProps {
  inscription: string;
  selectedId: InscriptionStyleId;
  onSelect: (id: InscriptionStyleId) => void;
}

export const InscriptionStylePicker = ({
  inscription,
  selectedId,
  onSelect
}: InscriptionStylePickerProps) => {
  const { t } = useTranslation();
  const previewText = inscription.trim() || t('designer.inscriptionPlaceholder').replace('...', '');
  const selectedStyle = getInscriptionStyle(selectedId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {INSCRIPTION_STYLES.map((style) => {
          const isActive = style.id === selectedId;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              className={[
                'group flex flex-col gap-1 rounded-lg border p-3 text-left transition',
                isActive
                  ? 'border-amber-300 bg-amber-300/5 ring-1 ring-amber-300'
                  : 'border-slate-700 hover:border-slate-500'
              ].join(' ')}
              aria-pressed={isActive}
            >
              <span
                className="block truncate text-base text-gray-100"
                style={style.css}
                title={previewText}
              >
                {previewText}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {t(style.labelKey)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          {t('designer.inscriptionStyle.preview')} · {t(selectedStyle.labelKey)}
        </p>
        <p
          className="mt-2 break-words text-2xl leading-snug text-amber-100"
          style={selectedStyle.css}
        >
          {previewText}
        </p>
        <p className="mt-2 text-[11px] text-slate-500">{t(selectedStyle.descriptionKey)}</p>
      </div>
    </div>
  );
};
