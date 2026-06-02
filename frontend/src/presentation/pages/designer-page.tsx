import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import type { TranslationKey } from '@application/i18n/translations';
import type { FinishType } from '@domain/entities/order-card';
import type { Material } from '@domain/entities/material';
import { submitOrderRequest } from '@infrastructure/api/order-api';
import { Header } from '@presentation/components/header';
import {
  DEFAULT_INSCRIPTION_STYLE_ID,
  InscriptionStylePicker,
  getInscriptionStyle,
  type InscriptionStyleId
} from '@presentation/components/inscription-styles';
import { MonumentViewer } from '@presentation/three/monument-viewer';
import type { MonumentShape } from '@presentation/three/monument-model';

interface DesignerPageProps {
  materials: Material[];
}

const FINISH_OPTIONS: { id: FinishType; labelKey: TranslationKey }[] = [
  { id: 'Polished', labelKey: 'designer.finish.polished' },
  { id: 'Honed', labelKey: 'designer.finish.honed' },
  { id: 'Matte', labelKey: 'designer.finish.matte' }
];

const SHAPE_OPTIONS: { id: MonumentShape; labelKey: TranslationKey }[] = [
  { id: 'classic', labelKey: 'designer.shape.classic' },
  { id: 'rounded', labelKey: 'designer.shape.rounded' },
  { id: 'gothic', labelKey: 'designer.shape.gothic' },
  { id: 'cross', labelKey: 'designer.shape.cross' },
  { id: 'heart', labelKey: 'designer.shape.heart' }
];

const DEFAULT_DIMENSIONS = { heightCm: 180, widthCm: 90, thicknessCm: 15 };

interface PresetKeys {
  label: TranslationKey;
  inscription: TranslationKey;
  name: TranslationKey;
  dates: TranslationKey;
}

const INSCRIPTION_PRESETS: PresetKeys[] = [
  {
    label: 'designer.presets.classic.label',
    inscription: 'designer.presets.classic.inscription',
    name: 'designer.presets.classic.name',
    dates: 'designer.presets.classic.dates'
  },
  {
    label: 'designer.presets.short.label',
    inscription: 'designer.presets.short.inscription',
    name: 'designer.presets.short.name',
    dates: 'designer.presets.short.dates'
  },
  {
    label: 'designer.presets.family.label',
    inscription: 'designer.presets.family.inscription',
    name: 'designer.presets.family.name',
    dates: 'designer.presets.family.dates'
  },
  {
    label: 'designer.presets.poetic.label',
    inscription: 'designer.presets.poetic.inscription',
    name: 'designer.presets.poetic.name',
    dates: 'designer.presets.poetic.dates'
  }
];

const serializeDimensions = (d: { heightCm: number; widthCm: number }) =>
  `${d.heightCm}x${d.widthCm}`;

const priceOf = (m: Material | undefined, d: { heightCm: number; widthCm: number }) => {
  if (!m) return 0;
  const areaM2 = (d.heightCm * d.widthCm) / 10000;
  return Math.round(areaM2 * m.pricePerM2 * 100) / 100;
};

export const DesignerPage = ({ materials }: DesignerPageProps) => {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [materialId, setMaterialId] = useState<string>('');
  const [finish, setFinish] = useState<FinishType>('Polished');
  /** Index of the currently active preset, or `null` when user typed custom text. */
  const [presetIndex, setPresetIndex] = useState<number | null>(0);
  const [inscription, setInscription] = useState<string>(() =>
    t(INSCRIPTION_PRESETS[0].inscription)
  );
  const [name, setName] = useState<string>(() => t(INSCRIPTION_PRESETS[0].name));
  const [dates, setDates] = useState<string>(() => t(INSCRIPTION_PRESETS[0].dates));
  const [inscriptionStyleId, setInscriptionStyleId] = useState<InscriptionStyleId>(
    DEFAULT_INSCRIPTION_STYLE_ID
  );
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  const [shape, setShape] = useState<MonumentShape>('classic');
  const [showCross, setShowCross] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inscriptionStyle = getInscriptionStyle(inscriptionStyleId);

  useEffect(() => {
    if (!materialId && materials.length > 0) {
      setMaterialId(materials[0].id);
    }
  }, [materialId, materials]);

  // Re-translate inscription/name/dates when language changes,
  // but only while the user is on a preset (hasn't typed their own text).
  useEffect(() => {
    if (presetIndex === null) return;
    const preset = INSCRIPTION_PRESETS[presetIndex];
    if (!preset) return;
    setInscription(t(preset.inscription));
    setName(t(preset.name));
    setDates(t(preset.dates));
  }, [language, presetIndex, t]);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId) ?? materials[0],
    [materialId, materials]
  );

  const estimatedPrice = priceOf(selectedMaterial, dimensions);

  const textureUrl = selectedMaterial?.imageUrl ?? '/images/black_granite_texture.jpg';

  const updateDimension = (key: keyof typeof DEFAULT_DIMENSIONS) => (value: number) =>
    setDimensions((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!user) {
      navigate('/sign-in', { state: { from: '/design' } });
      return;
    }
    if (!selectedMaterial) return;
    setSubmitMessage(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await submitOrderRequest({
        materialId: selectedMaterial.id,
        dimensions: serializeDimensions(dimensions),
        inscriptionText: inscription,
        finishType: finish
      });
      setSubmitMessage(t('designer.success'));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('designer.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            {t('designer.section.tag')}
          </p>
          <h1 className="mt-1 font-serif text-4xl text-gray-100">{t('designer.title')}</h1>
          <p className="mt-2 max-w-3xl text-slate-300">{t('designer.subtitle')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <MonumentViewer
            textureUrl={textureUrl}
            materialName={selectedMaterial?.name}
            finish={finish}
            dimensions={dimensions}
            inscription={inscription}
            name={name}
            dates={dates}
            inscriptionStyle={inscriptionStyle.three}
            shape={shape}
            showCross={showCross}
          />

          <aside className="space-y-5 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.material')}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {materials.map((m) => {
                  const active = m.id === materialId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMaterialId(m.id)}
                      className={[
                        'group overflow-hidden rounded-lg border text-left transition',
                        active
                          ? 'border-amber-300 ring-1 ring-amber-300'
                          : 'border-slate-700 hover:border-slate-500'
                      ].join(' ')}
                    >
                      <img
                        src={m.imageUrl}
                        alt={m.name}
                        className="h-16 w-full object-cover"
                      />
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-100">{m.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {m.pricePerM2.toFixed(0)} {t('designer.pricePerM2Unit')}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.finish')}
              </h2>
              <div className="mt-3 flex gap-2">
                {FINISH_OPTIONS.map((option) => {
                  const active = option.id === finish;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFinish(option.id)}
                      className={[
                        'flex-1 rounded-md border px-3 py-2 text-sm transition',
                        active
                          ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      ].join(' ')}
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.shape')}
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {SHAPE_OPTIONS.map((option) => {
                  const active = option.id === shape;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setShape(option.id)}
                      className={[
                        'rounded-md border px-3 py-2 text-xs transition',
                        active
                          ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      ].join(' ')}
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-amber-300"
                    checked={showCross}
                    onChange={(e) => setShowCross(e.target.checked)}
                  />
                  {t('designer.shape.showCross')}
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.dimensions')}
              </h2>
              <div className="mt-3 space-y-3">
                <SliderRow
                  label={t('designer.dimensions.height')}
                  value={dimensions.heightCm}
                  min={90}
                  max={240}
                  step={5}
                  unit={t('designer.units.cm')}
                  onChange={updateDimension('heightCm')}
                />
                <SliderRow
                  label={t('designer.dimensions.width')}
                  value={dimensions.widthCm}
                  min={40}
                  max={140}
                  step={5}
                  unit={t('designer.units.cm')}
                  onChange={updateDimension('widthCm')}
                />
                <SliderRow
                  label={t('designer.dimensions.thickness')}
                  value={dimensions.thicknessCm}
                  min={8}
                  max={30}
                  step={1}
                  unit={t('designer.units.cm')}
                  onChange={updateDimension('thicknessCm')}
                />
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.inscription')}
              </h2>
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  {t('designer.presets.title')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {INSCRIPTION_PRESETS.map((preset, idx) => {
                    const active = presetIndex === idx;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setPresetIndex(idx)}
                        className={[
                          'rounded-md border px-2 py-1 text-xs transition',
                          active
                            ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                            : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-gray-100'
                        ].join(' ')}
                      >
                        {t(preset.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                className="mt-3 h-20 w-full resize-none rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                value={inscription}
                onChange={(e) => {
                  setInscription(e.target.value);
                  setPresetIndex(null);
                }}
                placeholder={t('designer.inscriptionPlaceholder')}
                maxLength={140}
              />
              <p className="mt-1 text-right text-[10px] text-slate-500">
                {inscription.length}/140
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">
                    {t('designer.name')}
                  </span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setPresetIndex(null);
                    }}
                    placeholder={t('designer.namePlaceholder')}
                    maxLength={80}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">
                    {t('designer.dates')}
                  </span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                    value={dates}
                    onChange={(e) => {
                      setDates(e.target.value);
                      setPresetIndex(null);
                    }}
                    placeholder={t('designer.datesPlaceholder')}
                    maxLength={40}
                  />
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.inscriptionStyle')}
              </h2>
              <div className="mt-3">
                <InscriptionStylePicker
                  inscription={inscription || name}
                  selectedId={inscriptionStyleId}
                  onSelect={setInscriptionStyleId}
                />
              </div>
            </section>

            <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">{t('designer.estimatedCost')}</span>
                <span className="font-serif text-2xl text-amber-200">
                  {estimatedPrice.toFixed(2)} {t('designer.priceUnit')}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{t('designer.estimatedCostHint')}</p>
            </section>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedMaterial || isSubmitting}
              className="w-full rounded-md bg-gray-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              {isSubmitting
                ? t('designer.submitting')
                : user
                  ? t('designer.placeOrder')
                  : t('designer.signInToOrder')}
            </button>

            {submitMessage ? (
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {submitMessage}
              </p>
            ) : null}
            {submitError ? (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {submitError}
              </p>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
};

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

const SliderRow = ({ label, value, min, max, step, unit, onChange }: SliderRowProps) => (
  <label className="block">
    <div className="flex items-center justify-between text-xs text-slate-300">
      <span>{label}</span>
      <span className="font-mono text-slate-100">
        {value} {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-1 w-full accent-amber-300"
    />
  </label>
);
