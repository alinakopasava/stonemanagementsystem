import { describe, it, expect, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { server } from '../msw/server';
import { authenticatedAs } from '../msw/handlers';
import { InstallerCardsPage } from '@presentation/pages/installer-cards-page';

/**
 * The crew's worklist, read at a cemetery.
 *
 * Signal out there is unreliable, so the service worker keeps a copy of the
 * list and the page reads it when the phone is out of range. What the cases
 * below check is the part the service worker cannot do on its own: telling the
 * crew that what they are looking at is a copy, and how old it is.
 */

const CARD = {
  id: 'card-1',
  orderId: 'order-1',
  orderCardId: 'oc-1',
  status: 'oczekujące',
  price: 2500,
  installationAddress: 'Cmentarz Wschodni, kwatera 12',
  contractDetails: null,
  deadline: '2026-12-01',
  clientFullName: 'Anna Kowalska',
  createdAt: '2026-08-11T09:00:00Z',
  submittedAt: '2026-08-10T10:00:00Z',
  updatedAt: '2026-08-11T09:00:00Z',
  client: {
    firstName: 'Anna',
    lastName: 'Kowalska',
    phoneNumber: '+48 600 100 200',
    email: 'klient@example.com'
  },
  orderDetails: [],
  report: null
};

const worklistReturns = (cards: unknown[]) =>
  server.use(http.get('/api/installation-cards', () => HttpResponse.json({ data: cards })));

const setOnline = (online: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });

afterEach(() => {
  setOnline(true);
  localStorage.clear();
});

describe('InstallerCardsPage', () => {
  it('says the list is a copy, and when it was taken, while offline', async () => {
    server.use(authenticatedAs('monter'));
    worklistReturns([CARD]);
    localStorage.setItem('installer.syncedAt', '2026-09-01T06:15:00Z');
    setOnline(false);

    renderWithProviders(<InstallerCardsPage />, { route: '/installer' });

    // Without the date the warning is useless: a crew cannot tell an hour-old
    // list from a week-old one, and both look identical on screen.
    const banner = await screen.findByText(/no connection/i);
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/2026/);
  });

  it('warns without a date when nothing was ever synced', async () => {
    server.use(authenticatedAs('monter'));
    worklistReturns([]);
    setOnline(false);

    renderWithProviders(<InstallerCardsPage />, { route: '/installer' });

    expect(await screen.findByText(/the list may be out of date/i)).toBeInTheDocument();
  });

  it('shows no warning when the phone has signal', async () => {
    server.use(authenticatedAs('monter'));
    worklistReturns([CARD]);

    renderWithProviders(<InstallerCardsPage />, { route: '/installer' });

    await screen.findByText(/Cmentarz Wschodni/);
    expect(screen.queryByText(/no connection/i)).not.toBeInTheDocument();
  });

  it('re-reads the worklist by itself once the signal comes back', async () => {
    server.use(authenticatedAs('monter'));
    const reads = vi.fn();
    server.use(
      http.get('/api/installation-cards', () => {
        reads();
        return HttpResponse.json({ data: [CARD] });
      })
    );
    setOnline(false);

    renderWithProviders(<InstallerCardsPage />, { route: '/installer' });
    await waitFor(() => expect(reads).toHaveBeenCalledTimes(1));

    setOnline(true);
    window.dispatchEvent(new Event('online'));

    // A crew that has just driven off the cemetery should not have to know to
    // pull the list down again.
    await waitFor(() => expect(reads).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/no connection/i)).not.toBeInTheDocument());
  });

  it('records the moment of a reply that actually reached the server', async () => {
    server.use(authenticatedAs('monter'));
    worklistReturns([CARD]);

    renderWithProviders(<InstallerCardsPage />, { route: '/installer' });
    await screen.findByText(/Cmentarz Wschodni/);

    // Offline the answer comes from the service worker's copy, so only a reply
    // that reached the network is allowed to move this clock forward.
    await waitFor(() => expect(localStorage.getItem('installer.syncedAt')).not.toBeNull());
  });
});
