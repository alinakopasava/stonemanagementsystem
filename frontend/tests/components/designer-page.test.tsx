import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, LocationProbe } from '../utils/render';
import { server } from '../msw/server';
import { authenticatedAs, MATERIALS } from '../msw/handlers';
import { DesignerPage } from '@presentation/pages/designer-page';
import { Route, Routes } from 'react-router-dom';
import type { Material } from '@domain/entities/material';

/**
 * 7.5  The configurator — the largest component set.
 *
 * The 3D viewer is aliased to a stub for the whole suite, so what is checked
 * here is the configuration the page produces: the request it sends, the shape
 * it starts on, and how the inscription behaves across a language switch.
 */

const materials: Material[] = MATERIALS.map((m) => ({
  id: m.id,
  name: m.name,
  category: m.category,
  pricePerM2: m.price_per_m2,
  imageUrl: m.image_url
}));

const renderDesigner = (route = '/design') =>
  renderWithProviders(
    <Routes>
      <Route path="/design" element={<DesignerPage materials={materials} />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
    { route }
  );

const viewer = () => screen.getByTestId('monument-viewer');

describe('DesignerPage', () => {
  describe('saving a configuration', () => {
    it('sends a guest to sign-in with the configurator as the return address', async () => {
      const { user } = renderDesigner();

      const save = await screen.findByRole('button', { name: /place order|sign in to place|złóż zamówienie|zaloguj się, aby|оформить заказ|войдите, чтобы/i });
      await user.click(save);

      await waitFor(() =>
        expect(screen.getByTestId('location-probe')).toHaveAttribute('data-pathname', '/sign-in')
      );
      expect(screen.getByTestId('location-probe')).toHaveAttribute('data-from', '/design');
    });

    it('opens on the featured stone', async () => {
      renderDesigner();
      const chips = await screen.findAllByRole('button', { pressed: true });
      // The configurator and the catalogue lead with the same slab, so a
      // customer arriving from one recognises the other.
      expect(chips.some((chip) => /gabbro|габбро|gabro/i.test(chip.textContent ?? ''))).toBe(true);
    });

    it('sends the material, dimensions, inscription and finish a signed-in client chose', async () => {
      server.use(authenticatedAs('klient'));
      let received: Record<string, unknown> | null = null;
      server.use(
        http.post('/api/orders/submit', async ({ request }) => {
          received = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ data: { orderCard: { id: 'card-1' } } }, { status: 201 });
        })
      );

      const { user } = renderDesigner();
      const save = await screen.findByRole('button', { name: /place order|sign in to place|złóż zamówienie|zaloguj się, aby|оформить заказ|войдите, чтобы/i });
      await user.click(save);

      await waitFor(() => expect(received).not.toBeNull());
      // The shape the backend validates: a UUID, height x width x thickness in
      // centimetres, and one of the three finishes.
      expect(received).toMatchObject({
        materialId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        ),
        dimensions: expect.stringMatching(/^\d+x\d+x\d+$/),
        finishType: expect.stringMatching(/^(Polished|Honed|Matte)$/)
      });
      expect(String(received!.inscriptionText).length).toBeGreaterThan(0);
      // The rest of the configuration travels with it. Everything below used to
      // drive the preview and then be discarded, leaving the workshop without
      // the silhouette it is supposed to cut.
      expect(received).toMatchObject({
        shape: expect.stringMatching(/^(classic|rounded|stele)$/),
        inscriptionStyle: expect.stringMatching(/^(roman|elegant|script|classic|gothic)$/),
        slabVariant: expect.stringMatching(/^(none|half|full)$/),
        decoration: expect.stringMatching(/^(none|portrait|cross)$/),
        baseHeightCm: expect.any(Number),
        baseWidthCm: expect.any(Number),
        baseDepthCm: expect.any(Number),
        hasCross: expect.any(Boolean),
        hasFlowerbed: expect.any(Boolean)
      });
    });
  });

  describe('the shape parameter in the address', () => {
    it('honours every shape the catalogue can link to', async () => {
      for (const shape of ['classic', 'rounded', 'stele']) {
        const { unmount } = renderDesigner(`/design?shape=${shape}`);

        await waitFor(() => expect(viewer()).toHaveAttribute('data-shape', shape));
        unmount();
      }
    });

    it('falls back to the default shape for an unknown value, not to an empty view', async () => {
      renderDesigner('/design?shape=definitely-not-a-shape');

      // A blank configurator would be a worse answer than a sensible default.
      await waitFor(() => expect(viewer()).toHaveAttribute('data-shape', 'classic'));
      expect(screen.getByRole('button', { name: /place order|sign in to place|złóż zamówienie|zaloguj się, aby|оформить заказ|войдите, чтобы/i })).toBeInTheDocument();
    });

    it('falls back to the default for a shape that exists but is not for sale', async () => {
      renderDesigner('/design?shape=gothic');

      await waitFor(() => expect(viewer()).toHaveAttribute('data-shape', 'classic'));
    });
  });

  describe('inscription templates and the language switch', () => {
    /** Opens the inscription tab and returns its main textarea. */
    const openInscription = async (user: ReturnType<typeof renderDesigner>['user']) => {
      const tab = await screen.findByRole('button', { name: /^(inscription|inskrypcja|надпись)$/i });
      await user.click(tab);
      return (await screen.findByRole('textbox', {
        name: /^(inscription|inskrypcja|надпись)$/i
      })) as HTMLTextAreaElement;
    };

    /** The switcher is a flat group of EN / PL / RU buttons. */
    const switchLanguageTo = async (
      user: ReturnType<typeof renderDesigner>['user'],
      short: 'EN' | 'PL' | 'RU'
    ) => {
      const group = screen.getAllByRole('group', { name: /language|język|язык/i })[0];
      await user.click(within(group).getByRole('button', { name: short }));
    };

    it('re-translates an untouched template when the language changes', async () => {
      const { user } = renderDesigner();

      const textarea = await openInscription(user);
      const before = textarea.value;
      expect(before.length).toBeGreaterThan(0);

      await switchLanguageTo(user, 'PL');

      await waitFor(() => expect(textarea.value).not.toBe(before));
    });

    it('leaves text the user typed alone when the language changes', async () => {
      const { user } = renderDesigner();

      const textarea = await openInscription(user);
      await user.clear(textarea);
      await user.type(textarea, 'Moja wlasna inskrypcja');
      expect(textarea).toHaveValue('Moja wlasna inskrypcja');

      await switchLanguageTo(user, 'RU');

      // Overwriting what the customer wrote would silently destroy their text —
      // the failure mode this case exists to prevent.
      await waitFor(() => expect(textarea).toHaveValue('Moja wlasna inskrypcja'));
      // ...and the interface itself did follow the switch.
      expect(
        screen.getByRole('button', { name: /войдите, чтобы|оформить заказ/i })
      ).toBeInTheDocument();
    });
  });

  // The price shown here comes from `monumentPriceByn`, which the catalogue
  // suite already compares against the formula card by card.
});
