import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { server } from '../msw/server';
import { authenticatedAs } from '../msw/handlers';
import { Header } from '@presentation/components/header';

/**
 * The phone menu.
 *
 * jsdom applies no stylesheet, so a test cannot see which of the two layouts a
 * given viewport would show. What it can pin is the part that is decided in
 * JavaScript: the panel only exists once opened, and it offers the same
 * destinations as the bar — a section reachable on a laptop but not on a phone
 * is the failure this guards against.
 */

const openMenu = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  const toggle = await screen.findByRole('button', { name: /open menu/i });
  await user.click(toggle);
  return document.getElementById('mobile-nav') as HTMLElement;
};

describe('Header mobile menu', () => {
  it('keeps the panel closed until the toggle is pressed', async () => {
    renderWithProviders(<Header />);

    const toggle = await screen.findByRole('button', { name: /open menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('mobile-nav')).toBeNull();
  });

  it('opens a panel with the storefront destinations and the sign-in actions', async () => {
    const { user } = renderWithProviders(<Header />);

    const panel = await openMenu(user);

    expect(within(panel).getByRole('link', { name: /catalog/i })).toHaveAttribute(
      'href',
      '/catalog'
    );
    expect(within(panel).getByRole('link', { name: /3d designer/i })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('offers a signed-in customer their orders and a way out', async () => {
    server.use(authenticatedAs('klient'));

    const { user } = renderWithProviders(<Header />);
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /sign out/i }).length).toBeGreaterThan(0)
    );

    const panel = await openMenu(user);

    expect(within(panel).getByRole('link', { name: /my orders/i })).toHaveAttribute(
      'href',
      '/my-orders'
    );
    expect(within(panel).getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    // A customer has no business seeing the staff sections.
    expect(within(panel).queryByRole('link', { name: /installation cards/i })).toBeNull();
    expect(within(panel).queryByRole('link', { name: /^admin/i })).toBeNull();
  });

  it('offers an admin the staff sections too', async () => {
    server.use(authenticatedAs('admin'));

    const { user } = renderWithProviders(<Header />);
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: /installation cards/i }).length).toBeGreaterThan(0)
    );

    const panel = await openMenu(user);

    expect(within(panel).getByRole('link', { name: /installation cards/i })).toHaveAttribute(
      'href',
      '/installer'
    );
    // Ordering is a customer activity: staff reach the same orders through the
    // panels they work in, so the personal list is not offered to them.
    expect(within(panel).queryByRole('link', { name: /my orders/i })).toBeNull();
  });

  it('does not offer an installer a personal order list either', async () => {
    server.use(authenticatedAs('monter'));

    const { user } = renderWithProviders(<Header />);
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: /installation cards/i }).length).toBeGreaterThan(0)
    );

    const panel = await openMenu(user);

    expect(within(panel).queryByRole('link', { name: /my orders/i })).toBeNull();
    // Hiding the link is convenience; `/my-orders` itself is closed to
    // anyone but a klient by the route guard.
    expect(within(panel).getByRole('link', { name: /installation cards/i })).toBeInTheDocument();
  });

  it('lets a phone user switch language without the desktop bar', async () => {
    const { user } = renderWithProviders(<Header />);

    const panel = await openMenu(user);

    expect(within(panel).getByRole('button', { name: 'PL' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'RU' })).toBeInTheDocument();
  });
});
