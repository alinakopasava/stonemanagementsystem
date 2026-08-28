import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, LocationProbe } from '../utils/render';
import { server } from '../msw/server';
import { authenticatedAs } from '../msw/handlers';
import { ProtectedRoute } from '@presentation/components/protected-route';
import { Route, Routes } from 'react-router-dom';

/**
 * 7.5  Route protection, for every role/view combination.
 *
 * Hiding a link in the navigation is a convenience, not a control, so each case
 * asserts where the user actually ends up rather than what the menu shows.
 */

const Guarded = ({ roles }: { roles?: Array<'klient' | 'monter' | 'admin'> }) => (
  <Routes>
    <Route
      path="/admin"
      element={
        <ProtectedRoute allowedRoles={roles}>
          <div>admin panel</div>
        </ProtectedRoute>
      }
    />
    <Route
      path="/installer"
      element={
        <ProtectedRoute allowedRoles={roles}>
          <div>installer worklist</div>
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<LocationProbe />} />
  </Routes>
);

const probe = () => screen.getByTestId('location-probe');

describe('ProtectedRoute', () => {
  it('sends a guest to sign-in and remembers where they were going', async () => {
    // No session handler override: /api/me answers 401 by default.
    renderWithProviders(<Guarded roles={['admin']} />, { route: '/admin' });

    await waitFor(() => expect(probe()).toHaveAttribute('data-pathname', '/sign-in'));
    // The remembered destination is what lets sign-in return the user to /admin.
    expect(probe()).toHaveAttribute('data-from', '/admin');
  });

  it.each([['klient'], ['monter']] as const)(
    'sends a %s away from the admin panel to the home page',
    async (role) => {
      server.use(authenticatedAs(role));

      renderWithProviders(<Guarded roles={['admin']} />, { route: '/admin' });

      await waitFor(() => expect(probe()).toHaveAttribute('data-pathname', '/'));
    }
  );

  it('lets an admin into the admin panel', async () => {
    server.use(authenticatedAs('admin'));

    renderWithProviders(<Guarded roles={['admin']} />, { route: '/admin' });

    expect(await screen.findByText('admin panel')).toBeInTheDocument();
  });

  // The guard reads a list, so one case with two roles in it stands for the
  // whole installer view; the per-endpoint matrix lives in the API suite.
  it('lets a monter into a view opened to monters and admins', async () => {
    server.use(authenticatedAs('monter'));

    renderWithProviders(<Guarded roles={['monter', 'admin']} />, { route: '/installer' });

    expect(await screen.findByText('installer worklist')).toBeInTheDocument();
  });

  it('shows a waiting state instead of redirecting while the session is still unknown', async () => {
    // A redirect decided before /api/me answers would bounce a signed-in user
    // out of the panel on every page load.
    server.use(authenticatedAs('admin'));

    renderWithProviders(<Guarded roles={['admin']} />, { route: '/admin' });

    expect(screen.queryByTestId('location-probe')).not.toBeInTheDocument();
    await screen.findByText('admin panel');
  });

  it('admits any signed-in role when no role list is given', async () => {
    server.use(authenticatedAs('klient'));

    renderWithProviders(<Guarded />, { route: '/admin' });

    expect(await screen.findByText('admin panel')).toBeInTheDocument();
  });
});
