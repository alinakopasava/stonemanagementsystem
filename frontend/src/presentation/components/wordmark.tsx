import { Link } from 'react-router-dom';

/**
 * The masthead is set in the same face the workshop cuts into the stone,
 * spaced the way letters are laid out on a monument. No icon: a lockup that
 * pairs a generic glyph with the name says less than the name set well.
 */
export const Wordmark = ({ size = 'md' }: { size?: 'md' | 'lg' }) => (
  <Link
    to="/"
    className="group inline-flex items-baseline gap-[0.45em] text-ink transition-colors hover:text-brand"
  >
    <span
      className={[
        'u-lapidary leading-none',
        size === 'lg' ? 'text-lg' : 'text-[0.9375rem]'
      ].join(' ')}
    >
      Signature
    </span>
    <span
      className={[
        'u-lapidary leading-none text-ink-3 transition-colors group-hover:text-brand',
        size === 'lg' ? 'text-lg' : 'text-[0.9375rem]'
      ].join(' ')}
    >
      Stone
    </span>
  </Link>
);
