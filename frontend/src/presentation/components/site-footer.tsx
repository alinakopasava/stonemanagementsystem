import { Link } from 'react-router-dom';
import { useTranslation } from '@application/i18n/i18n-context';
import { LanguageSwitcher } from '@presentation/components/language-switcher';
import { Wordmark } from '@presentation/components/wordmark';

interface SiteFooterProps {
  /** Storefront pages each close on their own sign-off line. */
  note: string;
  /** The contact form only exists on the landing page. */
  contactHref?: string;
}

/**
 * The footer used to be a single line of small grey text. It carries the
 * navigation now, because a page that ends in a dead stop asks the reader to
 * scroll back up to do anything.
 */
export const SiteFooter = ({ note, contactHref = '/#contact' }: SiteFooterProps) => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <Wordmark size="lg" />
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-2">
            {t('hero.tagline')}
          </p>
        </div>

        <nav className="lg:col-span-4" aria-label={t('catalog.title')}>
          <ul className="flex flex-col gap-3 text-sm">
            <li>
              <Link to="/catalog" className="text-ink-2 transition-colors hover:text-brand">
                {t('header.catalog')}
              </Link>
            </li>
            <li>
              <Link to="/design" className="text-ink-2 transition-colors hover:text-brand">
                {t('header.designer')}
              </Link>
            </li>
            <li>
              <a href={contactHref} className="text-ink-2 transition-colors hover:text-brand">
                {t('landing.hero.contactCta')}
              </a>
            </li>
          </ul>
        </nav>

        <div className="lg:col-span-3 lg:justify-self-end">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-[1400px] px-4 py-6 text-xs text-ink-3 sm:px-6">
          {note}
        </p>
      </div>
    </footer>
  );
};
