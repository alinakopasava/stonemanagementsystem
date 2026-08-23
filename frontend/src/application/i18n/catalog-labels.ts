import type { TranslationKey } from './translations';

type Translate = (key: TranslationKey) => string;

const MATERIAL_KEYS: Record<string, TranslationKey> = {
  'Africa Granite': 'material.africa',
  'Amadeus Granite': 'material.amadeus',
  'Aurora Granite': 'material.aurora',
  'Baltic Granite': 'material.baltic',
  'Gabbro-Diabase': 'material.gabbroDiabase',
  'Gandhi Granite': 'material.gandhi',
  'Juparana Granite': 'material.juparana',
  'Labradorite Granite': 'material.labradorite',
  'Leznikovsky Granite': 'material.leznikovsky',
  Marble: 'material.marble',
  'Maslovsky Granite': 'material.maslovsky',
  'Silk Granite': 'material.silk',
  'Tiffany Granite': 'material.tiffany',
  'Black Granite': 'material.gabbroDiabase',
  'Grey Granite': 'material.gandhi',
  'Labradorite Blue': 'material.labradorite'
};

const FINISH_KEYS: Record<string, TranslationKey> = {
  Polished: 'designer.finish.polished',
  Honed: 'designer.finish.honed',
  Matte: 'designer.finish.matte'
};

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  Stone: 'material.category.stone'
};

export const materialLabel = (name: string | null | undefined, t: Translate, fallback = '') => {
  if (!name) return fallback;
  const key = MATERIAL_KEYS[name];
  return key ? t(key) : name;
};

export const finishLabel = (finish: string | null | undefined, t: Translate, fallback = '—') => {
  if (!finish) return fallback;
  const key = FINISH_KEYS[finish];
  return key ? t(key) : finish;
};

export const categoryLabel = (category: string | null | undefined, t: Translate, fallback = '') => {
  if (!category) return fallback;
  const key = CATEGORY_KEYS[category];
  return key ? t(key) : category;
};
