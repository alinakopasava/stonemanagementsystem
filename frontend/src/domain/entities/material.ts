export interface Material {
  id: string;
  name: string;
  category: string;
  pricePerM2: number;
  imageUrl: string;
}

/**
 * Names still stored in `materials.name` by rows created under the previous
 * 4-stone catalog, mapped to the canonical name they became.
 *
 * Single source of truth for the aliasing: every per-material lookup (image,
 * label, inscription colours, dark/seamless classification) resolves through
 * `canonicalMaterialName` first, so a legacy row is tuned by editing only the
 * canonical entry.
 */
const LEGACY_MATERIAL_ALIASES: Record<string, string> = {
  'Black Granite': 'Gabbro-Diabase',
  'Grey Granite': 'Gandhi Granite',
  'Labradorite Blue': 'Labradorite Granite'
};

/** Resolves a possibly-legacy `materials.name` to its canonical catalog name. */
export const canonicalMaterialName = (name: string | null | undefined): string =>
  name ? (LEGACY_MATERIAL_ALIASES[name] ?? name) : '';

/**
 * The stone the storefront leads with: the workshop's standard slab, and the
 * one most orders are cut from.
 */
export const FEATURED_MATERIAL_NAME = 'Gabbro-Diabase';

/**
 * The catalogue order with the featured stone moved to the front, everything
 * else left as the API returned it.
 *
 * Both the catalogue and the configurator open on their first stone, so putting
 * it first is what makes it the default — one rule instead of a separate "and
 * also select this one" step in each page.
 */
export const withFeaturedFirst = (materials: Material[]): Material[] => {
  const index = materials.findIndex(
    (material) => canonicalMaterialName(material.name) === FEATURED_MATERIAL_NAME
  );
  if (index <= 0) return materials;
  const ordered = [...materials];
  const [featured] = ordered.splice(index, 1);
  ordered.unshift(featured);
  return ordered;
};
