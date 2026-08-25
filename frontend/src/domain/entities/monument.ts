export type MonumentShape =
  | 'classic'
  | 'rounded'
  | 'cross'
  | 'gothic'
  | 'heart'
  | 'stele'
  | 'concave'
  | 'asymmetric'
  | 'wave-steep'
  | 'dome'
  | 'arc'
  | 'cross-top'
  | 'curvy';

/**
 * The silhouettes a customer can actually pick. `MonumentShape` covers every
 * geometry the renderer knows how to build, but only these are offered for sale.
 *
 * This is the single source of truth: the catalog cards, the designer's shape
 * picker and the `?shape=` deep-link guard all derive from it. Adding a shape to
 * the storefront is one edit here — never a second list somewhere else.
 */
export const SELECTABLE_MONUMENT_SHAPES = [
  'classic',
  'rounded',
  'stele'
] as const satisfies readonly MonumentShape[];

export type SelectableMonumentShape = (typeof SELECTABLE_MONUMENT_SHAPES)[number];

export const isSelectableMonumentShape = (
  value: unknown
): value is SelectableMonumentShape =>
  typeof value === 'string' &&
  (SELECTABLE_MONUMENT_SHAPES as readonly string[]).includes(value);
