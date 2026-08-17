import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ShapePreview } from '@presentation/components/shape-preview';
import { MonumentViewer } from '@presentation/three/monument-viewer';
import type {
  BaseDimensionsCm,
  MonumentDecoration,
  MonumentLayout,
  MonumentShape,
  NicheStyle,
  TombstoneSlabVariant
} from '@presentation/three/monument-model';

interface DesignerPageProps {
  materials: Material[];
}

const FINISH_OPTIONS: { id: FinishType; labelKey: TranslationKey }[] = [
  { id: 'Polished', labelKey: 'designer.finish.polished' },
  { id: 'Honed', labelKey: 'designer.finish.honed' },
  { id: 'Matte', labelKey: 'designer.finish.matte' }
];

/** `recommendedAspect` = intended H/W ratio for this silhouette. When the user picks a shape
 *  whose ratio differs noticeably from the current dimensions, the height is auto-adjusted so
 *  the rendered headstone matches the design profile the shape was tuned for. The user can
 *  still override the height afterwards via the slider. */
const SHAPE_OPTIONS: { id: MonumentShape; labelKey: TranslationKey; recommendedAspect?: number }[] = [
  { id: 'classic', labelKey: 'designer.shape.classic' },
  { id: 'stele', labelKey: 'designer.shape.stele' },
  { id: 'asymmetric', labelKey: 'designer.shape.asymmetric', recommendedAspect: 2.6 },
  { id: 'cross-top', labelKey: 'designer.shape.crossTop', recommendedAspect: 2.6 },
  { id: 'curvy', labelKey: 'designer.shape.curvy', recommendedAspect: 2.2 },
  { id: 'dome', labelKey: 'designer.shape.dome', recommendedAspect: 2.6 },
  { id: 'arc', labelKey: 'designer.shape.arc', recommendedAspect: 2.25 },
  { id: 'wave-steep', labelKey: 'designer.shape.waveSteep' },
  { id: 'concave', labelKey: 'designer.shape.concave' },
  { id: 'rounded', labelKey: 'designer.shape.rounded' },
  { id: 'gothic', labelKey: 'designer.shape.gothic' },
  { id: 'cross', labelKey: 'designer.shape.cross' },
  { id: 'heart', labelKey: 'designer.shape.heart' }
];

const DECORATION_OPTIONS: { id: MonumentDecoration; labelKey: TranslationKey }[] = [
  { id: 'none', labelKey: 'designer.decoration.none' },
  { id: 'portrait', labelKey: 'designer.decoration.portrait' },
  { id: 'medallion', labelKey: 'designer.decoration.medallion' },
  { id: 'cross', labelKey: 'designer.decoration.cross' }
];

const NICHE_STYLE_OPTIONS: { id: NicheStyle; labelKey: TranslationKey }[] = [
  { id: 'recessed', labelKey: 'designer.nicheStyle.recessed' },
  { id: 'framed', labelKey: 'designer.nicheStyle.framed' }
];

const SLAB_VARIANT_OPTIONS: { id: TombstoneSlabVariant; labelKey: TranslationKey }[] = [
  { id: 'none', labelKey: 'designer.slabVariant.none' },
  { id: 'half', labelKey: 'designer.slabVariant.half' },
  { id: 'full', labelKey: 'designer.slabVariant.full' }
];

const SLAB_THICKNESS_OPTIONS: number[] = [5, 8];

const LAYOUT_OPTIONS: { id: MonumentLayout; labelKey: TranslationKey }[] = [
  { id: 'single', labelKey: 'designer.layout.single' },
  { id: 'double', labelKey: 'designer.layout.double' }
];

type ConfiguratorTab = 'form' | 'size' | 'elements' | 'inscription';

const TABS: { id: ConfiguratorTab; labelKey: TranslationKey }[] = [
  { id: 'form', labelKey: 'designer.tab.form' },
  { id: 'size', labelKey: 'designer.tab.size' },
  { id: 'elements', labelKey: 'designer.tab.elements' },
  { id: 'inscription', labelKey: 'designer.tab.inscription' }
];

const DEFAULT_DIMENSIONS = { heightCm: 180, widthCm: 90, thicknessCm: 15 };
const DEFAULT_BASE_DIMENSIONS: BaseDimensionsCm = { heightCm: 14, widthCm: 130, depthCm: 40 };
/** Default 0 = the two stelas are flush against each other ("glued"), forming a single block. */
const DEFAULT_DOUBLE_GAP_CM = 0;

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

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });

const fileToDataUrl = (file: File) => readAsDataUrl(file);
const blobToDataUrl = (blob: Blob) => readAsDataUrl(blob);

export const DesignerPage = ({ materials }: DesignerPageProps) => {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();

  const [materialId, setMaterialId] = useState<string>('');
  const [finish, setFinish] = useState<FinishType>('Polished');
  /** Stone texture contrast: 1 = original image, lower flattens harsh-looking materials. */
  const [stoneContrast, setStoneContrast] = useState(1);
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
  const [baseDimensions, setBaseDimensions] = useState<BaseDimensionsCm>(DEFAULT_BASE_DIMENSIONS);
  const [searchParams] = useSearchParams();
  const shapeFromCatalog = searchParams.get('shape');
  const initialShape =
    SHAPE_OPTIONS.some((option) => option.id === shapeFromCatalog)
      ? (shapeFromCatalog as MonumentShape)
      : 'classic';
  const [shape, setShape] = useState<MonumentShape>(initialShape);
  const [showCross, setShowCross] = useState<boolean>(false);
  const [showFlowerbed, setShowFlowerbed] = useState<boolean>(true);
  const [tombstoneSlab, setTombstoneSlab] = useState<TombstoneSlabVariant>('full');
  const [slabThicknessCm, setSlabThicknessCm] = useState<number>(5);
  const [decoration, setDecoration] = useState<MonumentDecoration>('none');
  const [nicheStyle, setNicheStyle] = useState<NicheStyle>('recessed');
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [cutoutPhotoUrl, setCutoutPhotoUrl] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  /** Live engraving adjustments for the on-stone portrait. Defaults match the shader's
   *  auto-tuned baseline; the user can fine-tune per material via sliders. */
  const [photoBrightness, setPhotoBrightness] = useState(0);
  const [photoContrast, setPhotoContrast] = useState(1.1);
  /** 0 = opaque photo (max visible), 1 = strongly dissolves into the stone (seamless). */
  const [photoBlend, setPhotoBlend] = useState(0.4);

  const photoUrl = removeBg ? (cutoutPhotoUrl ?? originalPhotoUrl) : originalPhotoUrl;
  const [layout, setLayout] = useState<MonumentLayout>('single');
  const [secondaryInscription, setSecondaryInscription] = useState<string>('');
  const [secondaryName, setSecondaryName] = useState<string>('');
  const [secondaryDates, setSecondaryDates] = useState<string>('');
  const [doubleGapCm, setDoubleGapCm] = useState<number>(DEFAULT_DOUBLE_GAP_CM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ConfiguratorTab>('form');

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

  const updateBaseDimension = (key: keyof BaseDimensionsCm) => (value: number) =>
    setBaseDimensions((prev) => ({ ...prev, [key]: value }));

  const runBackgroundRemoval = async (sourceUrl: string) => {
    setIsProcessingPhoto(true);
    setPhotoError(null);
    try {
      const mod = await import('@imgly/background-removal');
      const removeBackground = mod.removeBackground ?? mod.default;
      if (typeof removeBackground !== 'function') {
        throw new Error('removeBackground export not found on @imgly/background-removal module');
      }
      const blob = await removeBackground(sourceUrl);
      const cutoutUrl = await blobToDataUrl(blob);
      setCutoutPhotoUrl(cutoutUrl);
    } catch {
      setCutoutPhotoUrl(null);
      setPhotoError(t('designer.photo.processError'));
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCutoutPhotoUrl(null);
    setPhotoError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setOriginalPhotoUrl(dataUrl);
      if (removeBg) {
        void runBackgroundRemoval(dataUrl);
      }
    } catch {
      setPhotoError(t('designer.photo.processError'));
    }
  };

  const handleToggleRemoveBg = (next: boolean) => {
    setRemoveBg(next);
    if (next && originalPhotoUrl && !cutoutPhotoUrl && !isProcessingPhoto) {
      void runBackgroundRemoval(originalPhotoUrl);
    }
  };

  const handleRemovePhoto = () => {
    setOriginalPhotoUrl(null);
    setCutoutPhotoUrl(null);
    setPhotoError(null);
  };

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

        <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
          <MonumentViewer
            textureUrl={textureUrl}
            materialName={selectedMaterial?.name}
            finish={finish}
            dimensions={dimensions}
            baseDimensions={baseDimensions}
            inscription={inscription}
            name={name}
            dates={dates}
            inscriptionStyle={inscriptionStyle.three}
            shape={shape}
            showCross={showCross}
            showFlowerbed={showFlowerbed}
            tombstoneSlab={tombstoneSlab}
            slabThicknessCm={slabThicknessCm}
            decoration={decoration}
            nicheStyle={nicheStyle}
            photoUrl={photoUrl ?? undefined}
            photoBrightness={photoBrightness}
            photoContrast={photoContrast}
            photoBlend={photoBlend}
            stoneContrast={stoneContrast}
            layout={layout}
            secondaryInscription={secondaryInscription}
            secondaryName={secondaryName}
            secondaryDates={secondaryDates}
            doubleGapCm={doubleGapCm}
          />

          <aside className="flex flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
            <nav className="flex gap-1 border-b border-slate-700/60 bg-slate-950/40 p-2">
              {TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      'flex-1 rounded-md px-2 py-2 text-xs font-medium transition sm:text-sm',
                      active
                        ? 'bg-amber-300/15 text-amber-100 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    ].join(' ')}
                  >
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </nav>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {activeTab === 'form' && (
                <>
            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.layout')}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {LAYOUT_OPTIONS.map((option) => {
                  const active = option.id === layout;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setLayout(option.id)}
                      className={[
                        'rounded-md border px-3 py-2 text-sm transition',
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
              <p className="mt-2 text-[11px] text-slate-500">
                {t('designer.layout.hint')}
              </p>
              {layout === 'double' && (
                <div className="mt-3">
                  <SliderRow
                    label={t('designer.doubleGap')}
                    value={doubleGapCm}
                    min={0}
                    max={40}
                    step={1}
                    unit={t('designer.units.cm')}
                    onChange={setDoubleGapCm}
                  />
                </div>
              )}
            </section>

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
              <div className="mt-3">
                <SliderRow
                  label={t('designer.stoneContrast')}
                  value={stoneContrast}
                  min={0.4}
                  max={1.4}
                  step={0.05}
                  unit=""
                  onChange={setStoneContrast}
                />
                <p className="mt-1 text-[11px] text-slate-500">{t('designer.stoneContrast.hint')}</p>
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.shape')}
              </h2>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {SHAPE_OPTIONS.map((option) => {
                  const active = option.id === shape;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      title={t(option.labelKey)}
                      onClick={() => {
                        setShape(option.id);
                        /** Auto-adjust height to match the shape's intended H/W ratio when one
                         *  is declared and the current geometry is off by more than 10 %. The
                         *  user keeps full manual control via the height slider afterwards. */
                        if (option.recommendedAspect) {
                          setDimensions((prev) => {
                            const currentAspect = prev.heightCm / Math.max(1, prev.widthCm);
                            if (Math.abs(currentAspect - option.recommendedAspect!) > 0.1) {
                              return {
                                ...prev,
                                heightCm: Math.round(prev.widthCm * option.recommendedAspect!)
                              };
                            }
                            return prev;
                          });
                        }
                      }}
                      className={[
                        'group relative flex aspect-square items-center justify-center rounded-md border bg-slate-950 p-2 transition',
                        active
                          ? 'border-amber-300 bg-amber-300/10 text-amber-200 shadow-[0_0_0_1px_rgba(252,211,77,0.45)]'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                      ].join(' ')}
                    >
                      <ShapePreview id={option.id} className="h-full w-full" />
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
                </>
              )}

              {activeTab === 'size' && (
                <>
            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.stelaSize')}
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
                {t('designer.baseSize')}
              </h2>
              <div className="mt-3 space-y-3">
                <SliderRow
                  label={t('designer.baseSize.width')}
                  value={baseDimensions.widthCm}
                  min={80}
                  max={200}
                  step={5}
                  unit={t('designer.units.cm')}
                  onChange={updateBaseDimension('widthCm')}
                />
                <SliderRow
                  label={t('designer.baseSize.depth')}
                  value={baseDimensions.depthCm}
                  min={25}
                  max={80}
                  step={5}
                  unit={t('designer.units.cm')}
                  onChange={updateBaseDimension('depthCm')}
                />
                <SliderRow
                  label={t('designer.baseSize.height')}
                  value={baseDimensions.heightCm}
                  min={6}
                  max={30}
                  step={1}
                  unit={t('designer.units.cm')}
                  onChange={updateBaseDimension('heightCm')}
                />
              </div>
            </section>
                </>
              )}

              {activeTab === 'elements' && (
                <>
            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.elements')}
              </h2>
              <div className="mt-3 space-y-4">
                <ToggleRow
                  label={t('designer.elements.flowerbed')}
                  hint={t('designer.elements.flowerbed.hint')}
                  checked={showFlowerbed}
                  onChange={setShowFlowerbed}
                />

                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-slate-500">
                    {t('designer.slabVariant')}
                  </h3>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {SLAB_VARIANT_OPTIONS.map((option) => {
                      const active = option.id === tombstoneSlab;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTombstoneSlab(option.id)}
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
                  <p className="mt-2 text-[11px] text-slate-500">
                    {t('designer.elements.tombstoneSlab.hint')}
                  </p>
                </div>

                {tombstoneSlab !== 'none' && (
                  <div>
                    <h3 className="text-[11px] uppercase tracking-wider text-slate-500">
                      {t('designer.slabThickness')}
                    </h3>
                    <div className="mt-2 flex gap-2">
                      {SLAB_THICKNESS_OPTIONS.map((value) => {
                        const active = value === slabThicknessCm;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSlabThicknessCm(value)}
                            className={[
                              'flex-1 rounded-md border px-3 py-2 text-sm transition',
                              active
                                ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                                : 'border-slate-700 text-slate-300 hover:border-slate-500'
                            ].join(' ')}
                          >
                            {value} {t('designer.units.cm')}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {t('designer.slabThickness.hint')}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                {t('designer.decoration')}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DECORATION_OPTIONS.map((option) => {
                  const active = option.id === decoration;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDecoration(option.id)}
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

              {(decoration === 'portrait' || decoration === 'medallion') && (
                <div className="mt-4">
                  <h3 className="text-[11px] uppercase tracking-wider text-slate-500">
                    {t('designer.nicheStyle')}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {NICHE_STYLE_OPTIONS.map((option) => {
                      const active = option.id === nicheStyle;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setNicheStyle(option.id)}
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
                  <p className="mt-2 text-[11px] text-slate-500">
                    {t('designer.nicheStyle.hint')}
                  </p>
                </div>
              )}

              {(decoration === 'portrait' || decoration === 'medallion') && (
                <div className="mt-4">
                  <h3 className="text-[11px] uppercase tracking-wider text-slate-500">
                    {t('designer.photo')}
                  </h3>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative shrink-0">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt=""
                          className={[
                            'h-16 w-16 border border-slate-600 bg-slate-950 object-cover',
                            decoration === 'medallion' ? 'rounded-full' : 'rounded-md'
                          ].join(' ')}
                        />
                      ) : (
                        <div
                          className={[
                            'flex h-16 w-16 items-center justify-center border border-dashed border-slate-600 text-[10px] text-slate-500',
                            decoration === 'medallion' ? 'rounded-full' : 'rounded-md'
                          ].join(' ')}
                        >
                          {t('designer.photo')}
                        </div>
                      )}
                      {isProcessingPhoto && (
                        <div
                          className={[
                            'absolute inset-0 flex items-center justify-center bg-slate-950/75 px-1 text-center text-[9px] leading-tight text-amber-100',
                            decoration === 'medallion' ? 'rounded-full' : 'rounded-md'
                          ].join(' ')}
                        >
                          {t('designer.photo.processing')}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="block cursor-pointer rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-center text-xs text-slate-200 transition hover:border-amber-300 hover:text-amber-100">
                        {photoUrl ? t('designer.photo.change') : t('designer.photo.upload')}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </label>
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="text-[11px] text-slate-400 underline-offset-2 hover:text-red-300 hover:underline"
                        >
                          {t('designer.photo.remove')}
                        </button>
                      )}
                    </div>
                  </div>

                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      className="accent-amber-300"
                      checked={removeBg}
                      onChange={(e) => handleToggleRemoveBg(e.target.checked)}
                    />
                    {t('designer.photo.removeBg')}
                  </label>

                  {photoUrl && (
                    <div className="mt-3 space-y-2 rounded-md border border-slate-700/60 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] uppercase tracking-wider text-slate-500">
                          {t('designer.photo.adjust')}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoBrightness(0);
                            setPhotoContrast(1.1);
                            setPhotoBlend(0.4);
                          }}
                          className="text-[10px] text-slate-400 underline-offset-2 hover:text-amber-200 hover:underline"
                        >
                          {t('designer.photo.adjust.reset')}
                        </button>
                      </div>
                      <SliderRow
                        label={t('designer.photo.adjust.brightness')}
                        value={photoBrightness}
                        min={-0.4}
                        max={0.4}
                        step={0.02}
                        unit=""
                        onChange={setPhotoBrightness}
                      />
                      <SliderRow
                        label={t('designer.photo.adjust.contrast')}
                        value={photoContrast}
                        min={0.5}
                        max={2.5}
                        step={0.05}
                        unit=""
                        onChange={setPhotoContrast}
                      />
                      <SliderRow
                        label={t('designer.photo.adjust.blend')}
                        value={photoBlend}
                        min={0}
                        max={1}
                        step={0.05}
                        unit=""
                        onChange={setPhotoBlend}
                      />
                    </div>
                  )}

                  {photoError ? (
                    <p className="mt-2 text-[11px] text-red-300">{photoError}</p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-slate-500">{t('designer.photo.hint')}</p>
                </div>
              )}
            </section>
                </>
              )}

              {activeTab === 'inscription' && (
                <>
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

            {layout === 'double' && (
              <section>
                <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                  {t('designer.secondary')}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">{t('designer.secondary.hint')}</p>
                <label className="mt-3 block">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">
                    {t('designer.secondary.inscription')}
                  </span>
                  <textarea
                    className="mt-1 h-20 w-full resize-none rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                    value={secondaryInscription}
                    onChange={(e) => setSecondaryInscription(e.target.value)}
                    placeholder={t('designer.inscriptionPlaceholder')}
                    maxLength={140}
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-500">
                    {secondaryInscription.length}/140
                  </p>
                </label>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">
                      {t('designer.secondary.name')}
                    </span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                      value={secondaryName}
                      onChange={(e) => setSecondaryName(e.target.value)}
                      placeholder={t('designer.namePlaceholder')}
                      maxLength={80}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">
                      {t('designer.secondary.dates')}
                    </span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                      value={secondaryDates}
                      onChange={(e) => setSecondaryDates(e.target.value)}
                      placeholder={t('designer.datesPlaceholder')}
                      maxLength={40}
                    />
                  </label>
                </div>
              </section>
            )}

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
                </>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-700/60 bg-slate-950/50 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-xs text-slate-400">
                    {t('designer.estimatedCost')}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {selectedMaterial?.name ?? '—'} · {dimensions.heightCm}×{dimensions.widthCm}{' '}
                    {t('designer.units.cm')}
                  </span>
                </div>
                <span className="shrink-0 font-serif text-3xl text-amber-200">
                  {estimatedPrice.toFixed(2)} {t('designer.priceUnit')}
                </span>
              </div>

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
            </div>
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

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

const ToggleRow = ({ label, hint, checked, onChange }: ToggleRowProps) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 transition hover:border-slate-500">
    <input
      type="checkbox"
      className="mt-1 accent-amber-300"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="flex-1">
      <span className="block text-sm text-gray-100">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span> : null}
    </span>
  </label>
);
