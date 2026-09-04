import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { server } from '../msw/server';
import { authenticatedAs } from '../msw/handlers';
import { AdminOrdersPage } from '@presentation/pages/admin-orders-page';

/**
 * The office register of production orders.
 *
 * The status is the one thing on this screen the customer also sees, so the
 * cases below cover the whole round trip: the office picks a new status, the
 * request carries it, and a refused request must not leave the list showing a
 * change that never reached the database.
 */

const ORDER = {
  id: 'order-1',
  status: 'oczekujące',
  price: 2500,
  installation_address: 'ul. Kwiatowa 1, Mińsk',
  contract_details: null,
  deadline: '2026-12-01',
  client_full_name: 'Anna Kowalska',
  passport_series: null,
  passport_number: null,
  created_at: '2026-08-11T09:00:00Z',
  updated_at: '2026-08-11T09:00:00Z',
  user_id: 'klient-1',
  order_card_id: 'card-1',
  installation_cards: null,
  order_cards: null,
  client: {
    id: 'klient-1',
    email: 'klient@example.com',
    firstName: 'Anna',
    lastName: 'Kowalska',
    phoneNumber: null,
    role: 'klient' as const,
    registeredAt: '2026-08-01T09:00:00Z'
  }
};

const DETAIL = {
  id: 'details-1',
  material_id: 'mat-1',
  dimensions: '100x60x8',
  inscription_text: 'Śp. Anna Kowalska\n1948 – 2026',
  finish_type: 'Polished',
  shape: 'stele',
  inscription_style: 'roman',
  slab_variant: 'full',
  slab_thickness_cm: 5,
  base_height_cm: 15,
  base_width_cm: 120,
  base_depth_cm: 20,
  decoration: 'portrait',
  has_cross: true,
  has_flowerbed: false,
  photo_path: 'card-1/portrait.png',
  photo_url: 'https://storage.test/card-1/portrait.png?token=signed',
  materials: { id: 'mat-1', name: 'Gabbro-Diabase', category: 'Stone', price_per_m2: 420 }
};

const WITH_DETAILS = {
  ...ORDER,
  order_cards: {
    id: 'card-1',
    user_id: 'klient-1',
    created_at: '2026-08-10T10:00:00Z',
    order_details: [DETAIL]
  }
};

const listReturns = (orders: unknown[]) =>
  server.use(http.get('/api/admin/orders', () => HttpResponse.json({ data: orders })));

describe('AdminOrdersPage', () => {
  it('sends the chosen status to the API', async () => {
    server.use(authenticatedAs('admin'));
    listReturns([ORDER]);

    const requests: Array<{ url: string; body: unknown }> = [];
    server.use(
      http.patch('/api/admin/orders/:id/status', async ({ request, params }) => {
        requests.push({ url: String(params.id), body: await request.json() });
        return HttpResponse.json({ data: { id: 'order-1', status: 'anulowane' } });
      })
    );

    const { user } = renderWithProviders(<AdminOrdersPage />, { route: '/admin/orders' });

    const select = await screen.findByRole('combobox', { name: /change order status/i });
    await user.selectOptions(select, 'anulowane');

    expect(requests).toEqual([{ url: 'order-1', body: { status: 'anulowane' } }]);
    // Cancelling is a status like any other: the order stays on the list.
    expect(screen.getByRole('combobox', { name: /change order status/i })).toHaveValue(
      'anulowane'
    );
  });

  it('puts the previous status back when the save fails', async () => {
    server.use(authenticatedAs('admin'));
    listReturns([ORDER]);
    server.use(
      http.patch('/api/admin/orders/:id/status', () =>
        HttpResponse.json({ error: 'Invalid order status.' }, { status: 400 })
      )
    );
    // jsdom has no alert of its own, and a silent rollback would be worse than
    // none: the office has to learn that the change did not go through.
    const alerted = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { user } = renderWithProviders(<AdminOrdersPage />, { route: '/admin/orders' });

    const select = await screen.findByRole('combobox', { name: /change order status/i });
    await user.selectOptions(select, 'zrealizowane');

    // The badge must not claim a state the database never accepted — the office
    // would file the job as done and nobody would come back to it.
    expect(await screen.findByRole('combobox', { name: /change order status/i })).toHaveValue(
      'oczekujące'
    );
    expect(alerted).toHaveBeenCalledOnce();
  });

  it('downloads the work sheet as a PDF file in the office’s language', async () => {
    server.use(authenticatedAs('admin'));
    listReturns([WITH_DETAILS]);

    let asked: { id: string; lang: string | null } | null = null;
    server.use(
      http.get('/api/admin/orders/:id/work-sheet.pdf', ({ request, params }) => {
        asked = { id: String(params.id), lang: new URL(request.url).searchParams.get('lang') };
        return HttpResponse.arrayBuffer(new TextEncoder().encode('%PDF-1.7').buffer, {
          headers: { 'Content-Type': 'application/pdf' }
        });
      })
    );

    // jsdom has neither of these; the download is the browser's job, so the
    // test only checks that the file was handed over to it.
    URL.createObjectURL = vi.fn(() => 'blob:work-sheet');
    URL.revokeObjectURL = vi.fn();
    const saved = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { user } = renderWithProviders(<AdminOrdersPage />, { route: '/admin/orders' });
    await user.click(await screen.findByRole('button', { name: /work sheet/i }));

    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    // The document is drawn by the API, so the office's language travels with
    // the request — the workshop reads the sheet, not the browser.
    expect(asked).toEqual({ id: 'order-1', lang: 'en' });
  });

  it('narrows the list to one status', async () => {
    server.use(authenticatedAs('admin'));
    listReturns([ORDER, { ...ORDER, id: 'order-2', status: 'anulowane' }]);

    const { user } = renderWithProviders(<AdminOrdersPage />, { route: '/admin/orders' });

    expect(await screen.findByText('#order-1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelled' }));

    expect(screen.getByText('#order-2')).toBeInTheDocument();
    expect(screen.queryByText('#order-1')).not.toBeInTheDocument();
  });
});
