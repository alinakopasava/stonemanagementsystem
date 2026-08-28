import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { server } from '../msw/server';
import { authenticatedAs } from '../msw/handlers';
import { MyOrdersPage } from '@presentation/pages/my-orders-page';

/**
 * The customer's own order list.
 *
 * A submission the office has not confirmed yet is still an order from the
 * customer's side, so the cases below cover both states: the confirmed order
 * with its price and deadline, and the one still awaiting a decision.
 */

const detail = {
  id: 'details-1',
  dimensions: '100x60',
  inscription_text: 'Śp. Anna Kowalska',
  finish_type: 'Polished',
  materials: {
    id: 'mat-1',
    name: 'Gabbro-Diabase',
    category: 'Stone',
    price_per_m2: 420
  }
};

const CONFIRMED = {
  id: 'card-confirmed',
  submitted_at: '2026-08-10T10:00:00Z',
  order_details: [detail],
  order: {
    id: 'order-1',
    status: 'w_realizacji',
    price: 2500,
    deadline: '2026-12-01',
    installation_address: 'ul. Kwiatowa 1, Mińsk',
    created_at: '2026-08-11T09:00:00Z',
    updated_at: '2026-08-12T09:00:00Z',
    order_card_id: 'card-confirmed'
  }
};

const AWAITING = {
  id: 'card-awaiting',
  submitted_at: '2026-08-20T10:00:00Z',
  order_details: [detail],
  order: null
};

const respondWith = (data: unknown, status = 200) =>
  server.use(http.get('/api/orders/mine', () => HttpResponse.json({ data }, { status })));

describe('MyOrdersPage', () => {
  it('tells a customer with no orders that they have none yet', async () => {
    server.use(authenticatedAs('klient'));
    // The default handler already answers with an empty list.

    renderWithProviders(<MyOrdersPage />, { route: '/my-orders' });

    expect(await screen.findByText('You have no orders yet.')).toBeInTheDocument();
    // An empty page with no way forward is a dead end, so the empty state
    // points at the configurator.
    expect(screen.getByRole('link', { name: /open the configurator/i })).toHaveAttribute(
      'href',
      '/design'
    );
  });

  it('lists every order the customer has placed', async () => {
    server.use(authenticatedAs('klient'));
    respondWith([AWAITING, CONFIRMED]);

    renderWithProviders(<MyOrdersPage />, { route: '/my-orders' });

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(screen.queryByText('You have no orders yet.')).not.toBeInTheDocument();
  });

  it('shows the status of a confirmed order together with its terms', async () => {
    server.use(authenticatedAs('klient'));
    respondWith([CONFIRMED]);

    renderWithProviders(<MyOrdersPage />, { route: '/my-orders' });

    const card = (await screen.findAllByRole('article'))[0];
    expect(within(card).getByText('In progress')).toBeInTheDocument();
    expect(within(card).getByText('ul. Kwiatowa 1, Mińsk')).toBeInTheDocument();
  });

  it('marks a submission the office has not converted yet as received', async () => {
    server.use(authenticatedAs('klient'));
    respondWith([AWAITING]);

    renderWithProviders(<MyOrdersPage />, { route: '/my-orders' });

    const card = (await screen.findAllByRole('article'))[0];
    expect(within(card).getByText('Order received')).toBeInTheDocument();
    // No price or deadline has been agreed yet, so neither is invented here.
    expect(within(card).queryByText('Deadline')).not.toBeInTheDocument();
  });

  it('shows the configuration the customer submitted', async () => {
    server.use(authenticatedAs('klient'));
    respondWith([CONFIRMED]);

    renderWithProviders(<MyOrdersPage />, { route: '/my-orders' });

    const card = (await screen.findAllByRole('article'))[0];
    expect(within(card).getByText('Gabbro-diabase')).toBeInTheDocument();
    expect(within(card).getByText('100x60')).toBeInTheDocument();
    expect(within(card).getByText('Polished')).toBeInTheDocument();
    expect(within(card).getByText('Śp. Anna Kowalska')).toBeInTheDocument();
  });

  it('reports a failed load instead of pretending the customer has no orders', async () => {
    server.use(authenticatedAs('klient'));
    respondWith({ message: 'Failed to load orders.' }, 500);

    renderWithProviders(<MyOrdersPage />, { route: '/my-orders' });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('You have no orders yet.')).not.toBeInTheDocument();
  });
});
