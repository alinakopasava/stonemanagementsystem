import type { TranslationKey } from './translations';
import { canonicalMaterialName } from '@domain/entities/material';
import type { MonumentShape } from '@domain/entities/monument';

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
  'Tiffany Granite': 'material.tiffany'
};

/** Shape ids are kebab-case; their translation keys are camelCase. */
const SHAPE_KEYS: Record<MonumentShape, TranslationKey> = {
  classic: 'designer.shape.classic',
  rounded: 'designer.shape.rounded',
  cross: 'designer.shape.cross',
  gothic: 'designer.shape.gothic',
  heart: 'designer.shape.heart',
  stele: 'designer.shape.stele',
  concave: 'designer.shape.concave',
  asymmetric: 'designer.shape.asymmetric',
  'wave-steep': 'designer.shape.waveSteep',
  dome: 'designer.shape.dome',
  arc: 'designer.shape.arc',
  'cross-top': 'designer.shape.crossTop',
  curvy: 'designer.shape.curvy'
};

export const shapeLabelKey = (shape: MonumentShape): TranslationKey => SHAPE_KEYS[shape];

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
  const key = MATERIAL_KEYS[canonicalMaterialName(name)];
  return key ? t(key) : name;
};

export const finishLabel = (finish: string | null | undefined, t: Translate, fallback = '-') => {
  if (!finish) return fallback;
  const key = FINISH_KEYS[finish];
  return key ? t(key) : finish;
};

export const categoryLabel = (category: string | null | undefined, t: Translate, fallback = '') => {
  if (!category) return fallback;
  const key = CATEGORY_KEYS[category];
  return key ? t(key) : category;
};
