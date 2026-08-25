import { describe, it, expect } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { server } from '../msw/server';
import { ContactForm } from '@presentation/components/contact-form';

/**
 * 7.5  Contact form.
 *
 * Fields are found by their visible label, so the tests keep passing when the
 * markup around them is restyled and fail when the form stops being usable.
 */

const fillIn = async (user: ReturnType<typeof renderWithProviders>['user']) => {
  await user.type(screen.getByRole('textbox', { name: /full name|imię|имя/i }), 'Anna Kowalska');
  await user.type(screen.getByRole('textbox', { name: /e-?mail/i }), 'anna@example.com');
  await user.type(
    screen.getByRole('textbox', { name: /message|wiadomo|сообщени/i }),
    'Proszę o wycenę.'
  );
};

const submitButton = () => screen.getByRole('button', { name: /send|wyślij|отправить/i });

describe('ContactForm', () => {
  it('clears every field after a successful send', async () => {
    const { user } = renderWithProviders(<ContactForm />);

    await fillIn(user);
    await user.click(submitButton());

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /full name|imię|имя/i })).toHaveValue('');
    });
    expect(screen.getByRole('textbox', { name: /e-?mail/i })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /message|wiadomo|сообщени/i })).toHaveValue('');
  });

  it('sends the trimmed field values to the backend', async () => {
    let received: Record<string, unknown> | null = null;
    server.use(
      http.post('/api/contact', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'msg-1' } }, { status: 201 });
      })
    );

    const { user } = renderWithProviders(<ContactForm />);
    await user.type(screen.getByRole('textbox', { name: /full name|imię|имя/i }), '  Anna  ');
    await user.type(screen.getByRole('textbox', { name: /e-?mail/i }), 'anna@example.com');
    await user.type(screen.getByRole('textbox', { name: /message|wiadomo|сообщени/i }), ' Pytanie ');
    await user.click(submitButton());

    await waitFor(() => expect(received).not.toBeNull());
    expect(received).toMatchObject({ name: 'Anna', email: 'anna@example.com', message: 'Pytanie' });
  });

  it('omits an empty phone number rather than sending an empty string', async () => {
    let received: Record<string, unknown> | null = null;
    server.use(
      http.post('/api/contact', async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 'msg-1' } }, { status: 201 });
      })
    );

    const { user } = renderWithProviders(<ContactForm />);
    await fillIn(user);
    await user.click(submitButton());

    await waitFor(() => expect(received).not.toBeNull());
    expect(received?.phone).toBeUndefined();
  });

  it('shows a distinct message when the rate limit is hit', async () => {
    server.use(
      http.post('/api/contact', () =>
        HttpResponse.json({ message: 'Too many attempts. Try again later.' }, { status: 429 })
      )
    );

    const { user } = renderWithProviders(<ContactForm />);
    await fillIn(user);
    await user.click(submitButton());

    const alert = await screen.findByRole('alert');
    // A generic failure here would read as "the site is broken" rather than
    // "wait a minute and try again".
    expect(alert).toHaveTextContent(/too many|zbyt wiele|слишком/i);
  });

  it('shows a generic error and keeps the input when the send fails', async () => {
    server.use(
      http.post('/api/contact', () => HttpResponse.json({ message: 'boom' }, { status: 500 }))
    );

    const { user } = renderWithProviders(<ContactForm />);
    await fillIn(user);
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // Losing what the visitor typed on a server hiccup would be worse than the error.
    expect(screen.getByRole('textbox', { name: /full name|imię|имя/i })).toHaveValue('Anna Kowalska');
  });

  it('disables the button while the request is in flight, so one click sends one message', async () => {
    server.use(
      http.post('/api/contact', async () => {
        await delay(150);
        return HttpResponse.json({ data: { id: 'msg-1' } }, { status: 201 });
      })
    );

    const { user } = renderWithProviders(<ContactForm />);
    await fillIn(user);
    await user.click(submitButton());

    // Guards against duplicate enquiries on a flaky connection.
    expect(submitButton()).toBeDisabled();
    await waitFor(() => expect(submitButton()).toBeEnabled(), { timeout: 3000 });
  });
});
