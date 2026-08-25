import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@application/auth/auth-context';
import { I18nProvider } from '@application/i18n/i18n-context';
import { CurrencyProvider } from '@application/currency/currency-context';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Initial URL, e.g. '/design?shape=stele'. */
  route?: string;
  /** Route pattern the element is mounted at, when the component reads params. */
  path?: string;
}

const Providers = ({ children }: { children: ReactNode }) => (
  <I18nProvider>
    <CurrencyProvider>
      <AuthProvider>{children}</AuthProvider>
    </CurrencyProvider>
  </I18nProvider>
);

/**
 * Renders a page inside the real provider stack on a memory router.
 *
 * Returns a `user` handle alongside the usual RTL result, so tests never reach
 * for `fireEvent` — user-event drives the same sequence of events a real
 * pointer and keyboard produce.
 */
export const renderWithProviders = (ui: ReactElement, options: Options = {}) => {
  const { route = '/', path, ...rtlOptions } = options;

  const result = render(
    <Providers>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        ) : (
          ui
        )}
      </MemoryRouter>
    </Providers>,
    rtlOptions
  );

  return { ...result, user: userEvent.setup() };
};

/**
 * Catch-all element that reports where a redirect landed. Component tests can
 * then assert on the destination instead of poking at router internals.
 */
export const LocationProbe = () => {
  const { pathname, search, state } = useLocationSafe();
  return (
    <div
      data-testid="location-probe"
      data-pathname={pathname}
      data-search={search}
      data-from={(state as { from?: string } | null)?.from ?? ''}
    >
      {pathname}
    </div>
  );
};

// Imported lazily to keep the probe usable outside a router in unit contexts.
import { useLocation } from 'react-router-dom';
const useLocationSafe = () => useLocation();

export { userEvent };
export * from '@testing-library/react';
