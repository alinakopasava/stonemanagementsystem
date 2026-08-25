export interface Material {
  id: string;
  name: string;
  category: string;
  pricePerM2: number;
  stockStatus: boolean;
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
