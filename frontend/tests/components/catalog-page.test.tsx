import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { CatalogPage } from '@presentation/pages/catalog-page';
import { monumentPriceByn } from '@application/pricing/monument-price';
import { SELECTABLE_MONUMENT_SHAPES } from '@domain/entities/monument';
import type { Material } from '@domain/entities/material';

/**
 * 7.5  Catalogue view.
 *
 * The displayed price is compared against `monumentPriceByn` — the same oracle
 * the unit tests pin and the configurator uses — rather than against a number
 * copied into the test. That is what makes this a check of consistency between
 * catalogue and configurator, not just of "some digits appeared".
 */

const STONE_NAMES = [
  'Africa Granite',
  'Amadeus Granite',
  'Aurora Granite',
  'Baltic Granite',
  'Gabbro-Diabase',
  'Gandhi Granite',
  'Juparana Granite',
  'Labradorite Granite',
  'Leznikovsky Granite',
  'Marble',
  'Maslovsky Granite',
  'Silk Granite',
  'Tiffany Granite'
];

const materials: Material[] = STONE_NAMES.map((name, index) => ({
  id: `${index}`.padStart(8, '0') + '-0000-4000-8000-000000000000',
  name,
  category: 'Stone',
  pricePerM2: 400 + index * 50,
  imageUrl: `/images/materials/${index}.jpg`
}));

/** The preview size the catalogue cards are priced at. */
const CATALOG_DIMENSIONS = { heightCm: 100, widthCm: 60 };

describe('CatalogPage', () => {
  it('offers all thirteen stones', async () => {
    renderWithProviders(<CatalogPage materials={materials} />);

    for (const name of STONE_NAMES) {
      expect(
        await screen.findByRole('button', { name: new RegExp(name.split(' ')[0], 'i') })
      ).toBeInTheDocument();
    }
  });

  it('renders one card per purchasable silhouette', async () => {
    renderWithProviders(<CatalogPage materials={materials} />);

    const previews = await screen.findAllByTestId('monument-viewer');
    expect(previews).toHaveLength(SELECTABLE_MONUMENT_SHAPES.length);
    expect(previews.map((p) => p.getAttribute('data-shape'))).toEqual([
      ...SELECTABLE_MONUMENT_SHAPES
    ]);
  });

  it('links every card into the configurator with a shape the configurator accepts', async () => {
    renderWithProviders(<CatalogPage materials={materials} />);

    const previews = await screen.findAllByTestId('monument-viewer');
    const cards = previews.map((p) => p.closest('article')!);

    expect(cards).toHaveLength(SELECTABLE_MONUMENT_SHAPES.length);
    for (const card of cards) {
      const href = within(card).getByRole('link').getAttribute('href')!;
      const shape = new URL(href, 'http://localhost').searchParams.get('shape');
      // A card pointing at a shape the configurator rejects would be a dead link.
      expect(SELECTABLE_MONUMENT_SHAPES).toContain(shape as never);
    }
  });

  /**
   * Prices are shown through the currency formatter: Russian bills in BYN, the
   * other languages convert to PLN. These two cases pin the language to Russian
   * so the figure on screen is the formula's own output, with no exchange rate
   * in between — the conversion itself is covered by the system tests.
   */
  const inRussian = () => window.localStorage.setItem('signature-stone.language', 'ru');

  /** Digits of the card's price text, e.g. "320,00 BYN" -> "32000". */
  const digitsIn = (element: Element) => (element.textContent ?? '').replace(/\D/g, '');

  it('prices the first stone using the shared formula', async () => {
    inRussian();
    renderWithProviders(<CatalogPage materials={materials} />);

    const previews = await screen.findAllByTestId('monument-viewer');
    const firstCard = previews[0].closest('article')!;

    const expected = monumentPriceByn(materials[0].pricePerM2, CATALOG_DIMENSIONS, 'classic');
    await waitFor(() =>
      expect(digitsIn(firstCard)).toContain(expected.toFixed(2).replace('.', ''))
    );
  });

  it('recalculates the price when a different stone is chosen', async () => {
    inRussian();
    const { user } = renderWithProviders(<CatalogPage materials={materials} />);

    const previews = await screen.findAllByTestId('monument-viewer');
    const firstCard = previews[0].closest('article')!;
    const before = firstCard.textContent;

    await user.click(await screen.findByRole('button', { name: /marble|marmur|мрамор/i }));

    // Every card follows the picker, not just the one whose price is checked.
    await waitFor(() => {
      for (const preview of previews) expect(preview).toHaveAttribute('data-material', 'Marble');
    });
    await waitFor(() => expect(firstCard.textContent).not.toBe(before));

    const expected = monumentPriceByn(
      materials.find((m) => m.name === 'Marble')!.pricePerM2,
      CATALOG_DIMENSIONS,
      'classic'
    );
    expect(digitsIn(firstCard)).toContain(expected.toFixed(2).replace('.', ''));
  });

  it('renders no previews at all until a stone has loaded', async () => {
    renderWithProviders(<CatalogPage materials={[]} />);

    expect(screen.queryAllByTestId('monument-viewer')).toHaveLength(0);
  });
});
