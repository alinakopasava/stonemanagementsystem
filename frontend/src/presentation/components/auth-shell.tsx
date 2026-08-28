import type { ReactNode } from 'react';
import { LanguageSwitcher } from '@presentation/components/language-switcher';
import { Wordmark } from '@presentation/components/wordmark';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Sign-in sits on the plain ground rather than in a floating panel. A single
 * column of content on an empty page is calmer than a card, and it removes the
 * border-inside-a-border look the old shell had on small screens.
 */
export const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <LanguageSwitcher variant="compact" />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md">
          <h1 className="u-display text-3xl text-ink">{title}</h1>
          {subtitle ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-line pt-6 text-sm text-ink-2">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
};
