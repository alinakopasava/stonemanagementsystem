import type { CSSProperties } from 'react';
import { useTranslation } from '@application/i18n/i18n-context';
import type { TranslationKey } from '@application/i18n/translations';

export type InscriptionStyleId = 'roman' | 'elegant' | 'script' | 'classic' | 'gothic';

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

/**
 * Local font files keep the 3D engraving independent from CDN availability.
 *
 * Two constraints picked these faces, and they pull against each other.
 *
 * Every face carries Latin, Latin Extended-A and Cyrillic, so one style renders
 * the inscription in all three interface languages. That alone rules out most
 * memorial lettering — Cinzel, UnifrakturMaguntia and the English roundhands
 * have no Cyrillic at all.
 *
 * The second constraint is the stone. A letter here is cut, not printed, and a
 * cut has a minimum width: the hairlines of a high-contrast face (Playfair at
 * 800, Great Vibes, Cormorant) simply disappear at engraving depth, leaving the
 * thick strokes stranded. So every face below is moderate-contrast with sturdy
 * serifs and open counters — shapes that survive being carved.
 */
const FONT_PATH = '/fonts';

export const INSCRIPTION_STYLES: InscriptionStyle[] = [
  {
    id: 'roman',
    labelKey: 'inscription.style.roman',
    descriptionKey: 'inscription.style.roman.desc',
    css: {
      fontFamily: '"PT Serif", serif',
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase'
    },
    three: {
      // Drawn for Russian text and low in contrast, which is why it holds up
      // set in capitals at the size a headstone name is cut.
      fontUrl: `${FONT_PATH}/pt-serif-700.woff`,
      letterSpacing: 0.16,
      transform: 'uppercase',
      fontScale: 1.02
    }
  },
  {
    id: 'classic',
    labelKey: 'inscription.style.classic',
    descriptionKey: 'inscription.style.classic.desc',
    css: {
      fontFamily: '"Literata", serif',
      fontWeight: 600,
      letterSpacing: '0.04em'
    },
    three: {
      // Wedge serifs and even stroke weight: the shapes stay whole when cut,
      // where Playfair at 800 lost its hairlines entirely.
      fontUrl: `${FONT_PATH}/literata-600.woff`,
      letterSpacing: 0.04,
      transform: 'none',
      fontScale: 1.04
    }
  },
  {
    id: 'elegant',
    labelKey: 'inscription.style.elegant',
    descriptionKey: 'inscription.style.elegant.desc',
    css: {
      fontFamily: '"Old Standard TT", serif',
      fontStyle: 'italic',
      fontWeight: 400,
      letterSpacing: '0.02em'
    },
    three: {
      // Turn-of-the-century academic italic: the memorial-plaque voice, with
      // far more body in the thin strokes than a Garamond italic has.
      fontUrl: `${FONT_PATH}/old-standard-400-italic.woff`,
      letterSpacing: 0.02,
      transform: 'none',
      fontScale: 1.18
    }
  },
  {
    id: 'script',
    labelKey: 'inscription.style.script',
    descriptionKey: 'inscription.style.script.desc',
    css: {
      fontFamily: '"Caveat", cursive',
      fontWeight: 700,
      letterSpacing: '0.01em'
    },
    three: {
      // A near-monoline hand. A formal roundhand looks better on paper, but its
      // hairlines are thinner than the cut and vanish into the stone.
      fontUrl: `${FONT_PATH}/caveat-700.woff`,
      letterSpacing: 0.02,
      transform: 'none',
      fontScale: 1.32
    }
  },
  {
    id: 'gothic',
    labelKey: 'inscription.style.gothic',
    descriptionKey: 'inscription.style.gothic.desc',
    css: {
      fontFamily: '"Ruslan Display", serif',
      fontWeight: 400,
      letterSpacing: '0.04em'
    },
    three: {
      fontUrl: `${FONT_PATH}/ruslan-display-400.woff`,
      letterSpacing: 0.04,
      transform: 'none',
      fontScale: 1.16
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
                'group flex flex-col gap-1 border p-3 text-left transition',
                isActive
                  ? 'border-brand bg-brand-soft ring-1 ring-brand'
                  : 'u-chip'
              ].join(' ')}
              aria-pressed={isActive}
            >
              <span
                className="block truncate text-base text-ink"
                style={style.css}
                title={previewText}
              >
                {previewText}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-ink-3">
                {t(style.labelKey)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border border-line bg-canvas p-4">
        <p className="text-[10px] uppercase tracking-wider text-ink-3">
          {t('designer.inscriptionStyle.preview')} · {t(selectedStyle.labelKey)}
        </p>
        <p className="mt-2 break-words text-2xl leading-snug text-brand" style={selectedStyle.css}>
          {previewText}
        </p>
        <p className="mt-2 text-[11px] text-ink-3">{t(selectedStyle.descriptionKey)}</p>
      </div>
    </div>
  );
};
