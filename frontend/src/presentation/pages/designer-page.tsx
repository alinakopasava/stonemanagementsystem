import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Cross, TriangleAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import { useCurrency } from '@application/currency/currency-context';
import { materialLabel, shapeLabelKey } from '@application/i18n/catalog-labels';
import type { TranslationKey } from '@application/i18n/translations';
import type { FinishType } from '@domain/entities/order-card';
import { withFeaturedFirst, type Material } from '@domain/entities/material';
import {
  SELECTABLE_MONUMENT_SHAPES,
  isSelectableMonumentShape,
  type MonumentShape
} from '@domain/entities/monument';
import { submitOrderRequest, uploadMonumentPhoto } from '@infrastructure/api/order-api';
import { monumentPriceByn } from '@application/pricing/monument-price';
import { Header } from '@presentation/components/header';
import {
  DEFAULT_INSCRIPTION_STYLE_ID,
  InscriptionStylePicker,
  getInscriptionStyle,
  type InscriptionStyleId
} from '@presentation/components/inscription-styles';
import { LazyMonumentViewer } from '@presentation/components/lazy-monument-viewer';
import { PhotoCropEditor } from '@presentation/components/photo-crop-editor';
import { getDefaultPhotoCrop, type PhotoCrop } from '@presentation/three/photo-crop';
import { getPhotoEngravingProfile } from '@presentation/three/stone-catalog';
import { removePhotoBackground } from '@infrastructure/photo/remove-background';
import { ShapePreview } from '@presentation/components/shape-preview';
import type {
  BaseDimensionsCm,
  MonumentDecoration,
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

/** Derived from the one storefront shape list so the picker and the catalog cards
 * can never drift apart. See `SELECTABLE_MONUMENT_SHAPES`. */
const SHAPE_OPTIONS: { id: MonumentShape; labelKey: TranslationKey }[] =
  SELECTABLE_MONUMENT_SHAPES.map((id) => ({ id, labelKey: shapeLabelKey(id) }));

const DECORATION_OPTIONS: { id: MonumentDecoration; labelKey: TranslationKey }[] = [
  { id: 'none', labelKey: 'designer.decoration.none' },
  { id: 'portrait', labelKey: 'designer.decoration.portrait' },
  { id: 'cross', labelKey: 'designer.decoration.cross' }
];


const SLAB_VARIANT_OPTIONS: { id: TombstoneSlabVariant; labelKey: TranslationKey }[] = [
  { id: 'none', labelKey: 'designer.slabVariant.none' },
  { id: 'half', labelKey: 'designer.slabVariant.half' },
  { id: 'full', labelKey: 'designer.slabVariant.full' }
];

const SLAB_THICKNESS_OPTIONS: number[] = [5, 8];

type ConfiguratorTab = 'form' | 'size' | 'elements' | 'inscription';

const TABS: { id: ConfiguratorTab; labelKey: TranslationKey }[] = [
  { id: 'form', labelKey: 'designer.tab.form' },
  { id: 'size', labelKey: 'designer.tab.size' },
  { id: 'elements', labelKey: 'designer.tab.elements' },
  { id: 'inscription', labelKey: 'designer.tab.inscription' }
];

const SIZE_STANDARDS = [
  {
    id: 's1' as const,
    stele: { heightCm: 100, widthCm: 60, thicknessCm: 10 },
    base: { heightCm: 20, widthCm: 60, depthCm: 15 }
  },
  {
    id: 's2' as const,
    stele: { heightCm: 100, widthCm: 50, thicknessCm: 10 },
    base: { heightCm: 20, widthCm: 50, depthCm: 15 }
  }
];

const DEFAULT_DIMENSIONS = { ...SIZE_STANDARDS[0].stele };
const DEFAULT_BASE_DIMENSIONS: BaseDimensionsCm = { ...SIZE_STANDARDS[0].base };
const DEFAULT_PHOTO_BRIGHTNESS = 0;
const DEFAULT_PHOTO_CONTRAST = 1;
const DEFAULT_PHOTO_BLEND = 0.08;
const PHOTO_PROCESS_TIMEOUT_MS = 45_000;

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

/**
 * `height x width x thickness`, centimetres.
 *
 * The thickness used to be dropped here, which left the workshop guessing at
 * the one dimension that decides how much stone gets bought. The format has
 * always accepted the third component.
 */
const serializeDimensions = (d: { heightCm: number; widthCm: number; thicknessCm: number }) =>
  `${d.heightCm}x${d.widthCm}x${d.thicknessCm}`;

const memorialInscriptionText = (inscription: string, name: string, dates: string) =>
  [inscription, name, dates]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n');

/** The configurator holds the cut-out portrait as a data URL; Storage wants bytes. */
const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });

const fileToDataUrl = (file: File) => readAsDataUrl(file);

export const DesignerPage = ({ materials: unordered }: DesignerPageProps) => {
  /** The featured stone leads the picker, and the configurator opens on it. */
  const materials = useMemo(() => withFeaturedFirst(unordered), [unordered]);
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const { formatFromByn, isRateStale } = useCurrency();
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
  const [baseDimensions, setBaseDimensions] = useState<BaseDimensionsCm>(DEFAULT_BASE_DIMENSIONS);
  const [searchParams] = useSearchParams();
  const shapeFromCatalog = searchParams.get('shape');
  const initialShape: MonumentShape = isSelectableMonumentShape(shapeFromCatalog)
    ? shapeFromCatalog
    : 'classic';
  const [shape, setShape] = useState<MonumentShape>(initialShape);
  const [showCross, setShowCross] = useState<boolean>(false);
  const [showFlowerbed, setShowFlowerbed] = useState<boolean>(true);
  const [tombstoneSlab, setTombstoneSlab] = useState<TombstoneSlabVariant>('full');
  const [slabThicknessCm, setSlabThicknessCm] = useState<number>(5);
  const [decoration, setDecoration] = useState<MonumentDecoration>('none');
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [cutoutPhotoUrl, setCutoutPhotoUrl] = useState<string | null>(null);
  // Background removal is now a manual button, not automatic: false = show the
  // photo as uploaded, true = show the cut-out once the button has produced it.
  const [removeBg, setRemoveBg] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  /** Live engraving adjustments for the on-stone portrait. They follow the chosen
   * slab on their own until the customer moves a slider, after which their own
   * setting is kept rather than overwritten by the next stone. */
  const [photoBrightness, setPhotoBrightness] = useState(DEFAULT_PHOTO_BRIGHTNESS);
  const [photoContrast, setPhotoContrast] = useState(DEFAULT_PHOTO_CONTRAST);
  /** 0 = opaque photo (max visible), 1 = strongly dissolves into the stone (seamless). */
  const [photoBlend, setPhotoBlend] = useState(DEFAULT_PHOTO_BLEND);
  const photoTunedByHand = useRef(false);
  const [photoCrop, setPhotoCrop] = useState<PhotoCrop>(() => getDefaultPhotoCrop('portrait'));
  const photoJobId = useRef(0);

  const photoUrl = removeBg ? (cutoutPhotoUrl ?? originalPhotoUrl) : originalPhotoUrl;
  const photoAspect = 'portrait';
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

  useEffect(() => {
    setPhotoCrop(getDefaultPhotoCrop(photoAspect));
  }, [decoration]);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId) ?? materials[0],
    [materialId, materials]
  );

  /** Speckled red granite and pale marble need a different cut to read equally
   *  well, so the engraving retunes itself whenever the stone changes. */
  const photoProfile = useMemo(
    () => getPhotoEngravingProfile(selectedMaterial?.name),
    [selectedMaterial?.name]
  );

  useEffect(() => {
    if (photoTunedByHand.current) return;
    setPhotoBrightness(photoProfile.brightness);
    setPhotoContrast(photoProfile.contrast);
    setPhotoBlend(photoProfile.blend);
  }, [photoProfile]);

  const estimatedPrice = selectedMaterial
    ? monumentPriceByn({
        pricePerM2: selectedMaterial.pricePerM2,
        stela: dimensions,
        shape,
        finish,
        base: baseDimensions,
        slab: { variant: tombstoneSlab, thicknessCm: slabThicknessCm },
        inscriptionLength: memorialInscriptionText(inscription, name, dates).length,
        decoration,
        hasFlowerbed: showFlowerbed,
        hasCross: showCross
      })
    : 0;

  const textureUrl = selectedMaterial?.imageUrl ?? '/images/materials/gabbro-diabase.jpg';

  const updateDimension = (key: keyof typeof DEFAULT_DIMENSIONS) => (value: number) =>
    setDimensions((prev) => ({ ...prev, [key]: value }));

  const updateBaseDimension = (key: keyof BaseDimensionsCm) => (value: number) =>
    setBaseDimensions((prev) => ({ ...prev, [key]: value }));

  const runBackgroundRemoval = async (sourceUrl: string) => {
    const jobId = ++photoJobId.current;
    setIsProcessingPhoto(true);
    setPhotoError(null);
    try {
      const cutoutUrl = await removePhotoBackground(sourceUrl, PHOTO_PROCESS_TIMEOUT_MS);
      if (jobId !== photoJobId.current) return;
      setCutoutPhotoUrl(cutoutUrl);
    } catch {
      if (jobId !== photoJobId.current) return;
      setCutoutPhotoUrl(null);
      setPhotoError(t('designer.photo.processError'));
    } finally {
      if (jobId === photoJobId.current) {
        setIsProcessingPhoto(false);
      }
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    photoJobId.current += 1;
    setCutoutPhotoUrl(null);
    setPhotoError(null);
    setIsProcessingPhoto(false);
    try {
      const dataUrl = await fileToDataUrl(file);
      setOriginalPhotoUrl(dataUrl);
      setRemoveBg(false);
      setPhotoCrop(getDefaultPhotoCrop(photoAspect));
    } catch {
      setPhotoError(t('designer.photo.processError'));
    }
  };

  const handleRemoveBackground = () => {
    // Toggle: if the cut-out is showing, put the original back; otherwise remove
    // the background now (running the job the first time it is asked for).
    if (removeBg) {
      setRemoveBg(false);
      return;
    }
    setRemoveBg(true);
    if (originalPhotoUrl && !cutoutPhotoUrl && !isProcessingPhoto) {
      void runBackgroundRemoval(originalPhotoUrl);
    }
  };

  const handleRemovePhoto = () => {
    photoJobId.current += 1;
    setOriginalPhotoUrl(null);
    setCutoutPhotoUrl(null);
    setPhotoError(null);
    setIsProcessingPhoto(false);
    setPhotoCrop(getDefaultPhotoCrop(photoAspect));
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
      const response = await submitOrderRequest({
        materialId: selectedMaterial.id,
        dimensions: serializeDimensions(dimensions),
        inscriptionText: memorialInscriptionText(inscription, name, dates),
        finishType: finish,
        // Everything else the customer decided here. Until now it drove the
        // preview and then evaporated on submit, so the workshop never learned
        // what shape to cut.
        shape,
        inscriptionStyle: inscriptionStyleId,
        slabVariant: tombstoneSlab,
        slabThicknessCm: tombstoneSlab === 'none' ? undefined : slabThicknessCm,
        baseHeightCm: baseDimensions.heightCm,
        baseWidthCm: baseDimensions.widthCm,
        baseDepthCm: baseDimensions.depthCm,
        decoration,
        hasCross: showCross,
        hasFlowerbed: showFlowerbed
      });
      // The portrait is the one thing on a monument that cannot be written
      // down, so it follows the card as a second request. A card without it is
      // still a valid card, which is why a failed upload warns rather than
      // discarding everything the customer just configured.
      const cardId = response?.data?.orderCard?.id;
      if (cardId && photoUrl && decoration !== 'none') {
        try {
          await uploadMonumentPhoto(cardId, await dataUrlToBlob(photoUrl));
        } catch {
          setSubmitError(t('designer.photoUploadError'));
        }
      }

      setSubmitMessage(t('designer.success'));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('designer.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <Header />
      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8">
          <h1 className="u-display text-3xl text-ink sm:text-4xl">{t('designer.title')}</h1>
          <p className="mt-3 max-w-prose text-ink-2">{t('designer.subtitle')}</p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="border border-line bg-surface">
            <LazyMonumentViewer
              label={t('designer.previewLoading')}
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
            photoUrl={photoUrl ?? undefined}
            photoCrop={photoCrop}
            photoBrightness={photoBrightness}
            photoContrast={photoContrast}
            photoBlend={photoBlend}
            />
          </div>

          <aside className="flex flex-col overflow-hidden border border-line bg-surface lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
            <nav className="flex border-b border-line bg-canvas">
              {TABS.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={active}
                    className={[
                      'flex-1 border-b-2 px-2 py-3 text-xs font-medium transition-colors sm:text-sm',
                      active
                        ? 'border-brand text-ink'
                        : 'border-transparent text-ink-3 hover:text-ink'
                    ].join(' ')}
                  >
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </nav>

            <div className="u-scroll flex-1 space-y-5 overflow-y-auto p-6">
              {activeTab === 'form' && (
                <>

                  <section>
                    <h2 className="u-group-label">
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
                            aria-pressed={active}
                            className={[
                              'group overflow-hidden border text-left transition',
                              active
                                ? 'u-chip u-chip-active ring-1 ring-brand'
                                : 'u-chip'
                            ].join(' ')}
                          >
                            <img
                              src={m.imageUrl}
                              alt={materialLabel(m.name, t)}
                              className="h-16 w-full object-cover"
                            />
                            <div className="p-2">
                              <p className="text-xs font-medium text-ink">
                                {materialLabel(m.name, t)}
                              </p>
                              <p className="text-[10px] text-ink-3">
                                {formatFromByn(m.pricePerM2, { digits: 2 })}{' '}
                                {t('designer.pricePerM2Unit')}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <h2 className="u-group-label">
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
                              'flex-1 border px-3 py-2 text-sm transition',
                              active
                                ? 'u-chip u-chip-active'
                                : 'u-chip'
                            ].join(' ')}
                          >
                            {t(option.labelKey)}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <h2 className="u-group-label">
                      {t('designer.shape')}
                    </h2>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {SHAPE_OPTIONS.map((option) => {
                        const active = option.id === shape;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            title={t(option.labelKey)}
                            onClick={() => setShape(option.id)}
                            className={[
                              'group relative flex aspect-square items-center justify-center border bg-canvas p-2 transition',
                              active
                                ? 'u-chip u-chip-active ring-1 ring-brand'
                                : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
                            ].join(' ')}
                          >
                            <ShapePreview id={option.id} className="h-full w-full" />
                          </button>
                        );
                      })}
                    </div>
                    {/* A toggle, like every other choice in this panel. It used
                        to be a bare checkbox, the only one in the configurator. */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCross((on) => !on)}
                        aria-pressed={showCross}
                        className={[
                          'flex items-center gap-2 border px-3 py-2 text-sm transition',
                          showCross ? 'u-chip u-chip-active ring-1 ring-brand' : 'u-chip'
                        ].join(' ')}
                      >
                        <Cross
                          className="h-4 w-4 shrink-0"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                        {t('designer.shape.showCross')}
                      </button>
                    </div>
                  </section>
                </>
              )}

              {activeTab === 'size' && (
                <>
                  <section>
                    <h2 className="u-group-label">
                      {t('designer.size.standards')}
                    </h2>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {SIZE_STANDARDS.map((standard) => {
                        const active =
                          dimensions.heightCm === standard.stele.heightCm &&
                          dimensions.widthCm === standard.stele.widthCm &&
                          dimensions.thicknessCm === standard.stele.thicknessCm &&
                          baseDimensions.heightCm === standard.base.heightCm &&
                          baseDimensions.widthCm === standard.base.widthCm &&
                          baseDimensions.depthCm === standard.base.depthCm;
                        return (
                          <button
                            key={standard.id}
                            type="button"
                            onClick={() => {
                              setDimensions({ ...standard.stele });
                              setBaseDimensions({ ...standard.base });
                            }}
                            className={[
                              'border px-3 py-2 text-left text-sm transition',
                              active
                                ? 'u-chip u-chip-active'
                                : 'u-chip'
                            ].join(' ')}
                          >
                            <span className="block font-medium">
                              {t(
                                standard.id === 's1'
                                  ? 'designer.size.standard1'
                                  : 'designer.size.standard2'
                              )}
                            </span>
                            <span className="mt-1 block text-[11px] text-ink-3">
                              {t(
                                standard.id === 's1'
                                  ? 'designer.size.standard1.detail'
                                  : 'designer.size.standard2.detail'
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <h2 className="u-group-label">
                      {t('designer.stelaSize')}
                    </h2>
                    <div className="mt-3 space-y-3">
                      <SliderRow
                        label={t('designer.dimensions.height')}
                        value={dimensions.heightCm}
                        min={70}
                        max={160}
                        step={5}
                        unit={t('designer.units.cm')}
                        onChange={updateDimension('heightCm')}
                      />
                      <SliderRow
                        label={t('designer.dimensions.thickness')}
                        value={dimensions.thicknessCm}
                        min={5}
                        max={12}
                        step={1}
                        unit={t('designer.units.cm')}
                        onChange={updateDimension('thicknessCm')}
                      />
                    </div>
                  </section>

                  <section>
                    <h2 className="u-group-label">
                      {t('designer.baseSize')}
                    </h2>
                    <div className="mt-3 space-y-3">
                      <SliderRow
                        label={t('designer.baseSize.width')}
                        value={baseDimensions.widthCm}
                        min={40}
                        max={120}
                        step={5}
                        unit={t('designer.units.cm')}
                        onChange={updateBaseDimension('widthCm')}
                      />
                      <SliderRow
                        label={t('designer.baseSize.height')}
                        value={baseDimensions.heightCm}
                        min={10}
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
                    <h2 className="u-group-label">
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
                        <h3 className="u-group-label">
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
                                  'border px-3 py-2 text-xs transition',
                                  active
                                    ? 'u-chip u-chip-active'
                                    : 'u-chip'
                                ].join(' ')}
                              >
                                {t(option.labelKey)}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-ink-3">
                          {t('designer.elements.tombstoneSlab.hint')}
                        </p>
                      </div>

                      {tombstoneSlab !== 'none' && (
                        <div>
                          <h3 className="u-group-label">
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
                                    'flex-1 border px-3 py-2 text-sm transition',
                                    active
                                      ? 'u-chip u-chip-active'
                                      : 'u-chip'
                                  ].join(' ')}
                                >
                                  {value} {t('designer.units.cm')}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-2 text-[11px] text-ink-3">
                            {t('designer.slabThickness.hint')}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <h2 className="u-group-label">
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
                              'border px-3 py-2 text-xs transition',
                              active
                                ? 'u-chip u-chip-active'
                                : 'u-chip'
                            ].join(' ')}
                          >
                            {t(option.labelKey)}
                          </button>
                        );
                      })}
                    </div>

                    {decoration === 'portrait' && (
                      <div className="mt-4">
                        <h3 className="u-group-label">
                          {t('designer.photo')}
                        </h3>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="relative shrink-0">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt=""
                                className={[
                                  'h-16 w-16 border border-line bg-canvas object-cover',
                                ].join(' ')}
                              />
                            ) : (
                              <div
                                className={[
                                  'flex h-16 w-16 items-center justify-center border border-dashed border-line text-[10px] text-ink-3',
                                ].join(' ')}
                              >
                                {t('designer.photo')}
                              </div>
                            )}
                            {isProcessingPhoto && (
                              <div
                                className={[
                                  'absolute inset-0 flex items-center justify-center bg-canvas px-1 text-center text-[9px] leading-tight text-brand',
                                ].join(' ')}
                              >
                                {t('designer.photo.processing')}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="block cursor-pointer border border-line bg-canvas px-3 py-2 text-center text-xs text-ink-2 transition hover:border-brand hover:text-brand">
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
                                className="text-[11px] text-ink-3 underline-offset-2 hover:text-critical hover:underline"
                              >
                                {t('designer.photo.remove')}
                              </button>
                            )}
                          </div>
                        </div>

                        {photoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveBackground}
                            disabled={isProcessingPhoto}
                            className="mt-3 w-full border border-line bg-canvas px-3 py-2 text-center text-xs text-ink-2 transition hover:border-brand hover:text-brand disabled:opacity-50"
                          >
                            {removeBg
                              ? t('designer.photo.restoreBg')
                              : t('designer.photo.removeBg')}
                          </button>
                        )}

                        {photoUrl && (
                          <div className="mt-3">
                            <PhotoCropEditor
                              imageUrl={photoUrl}
                              aspect={photoAspect}
                              crop={photoCrop}
                              onChange={setPhotoCrop}
                            />
                          </div>
                        )}

                        {photoUrl && (
                          <div className="mt-3 space-y-2 border border-line bg-canvas p-3">
                            <div className="flex items-center justify-between">
                              <h4 className="u-group-label">
                                {t('designer.photo.adjust')}
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  // Back to what this stone asks for, and let the
                                  // engraving follow the slab again.
                                  photoTunedByHand.current = false;
                                  setPhotoBrightness(photoProfile.brightness);
                                  setPhotoContrast(photoProfile.contrast);
                                  setPhotoBlend(photoProfile.blend);
                                }}
                                className="text-[10px] text-ink-3 underline-offset-2 hover:text-brand hover:underline"
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
                              onChange={(next) => {
                                photoTunedByHand.current = true;
                                setPhotoBrightness(next);
                              }}
                            />
                            <SliderRow
                              label={t('designer.photo.adjust.contrast')}
                              value={photoContrast}
                              min={0.5}
                              max={2.5}
                              step={0.05}
                              unit=""
                              onChange={(next) => {
                                photoTunedByHand.current = true;
                                setPhotoContrast(next);
                              }}
                            />
                            <SliderRow
                              label={t('designer.photo.adjust.blend')}
                              value={photoBlend}
                              min={0}
                              max={1}
                              step={0.05}
                              unit=""
                              onChange={(next) => {
                                photoTunedByHand.current = true;
                                setPhotoBlend(next);
                              }}
                            />
                          </div>
                        )}

                        {photoError ? (
                          <p className="mt-2 text-[11px] text-critical">{photoError}</p>
                        ) : null}
                        <p className="mt-2 text-[11px] text-ink-3">{t('designer.photo.hint')}</p>
                      </div>
                    )}
                  </section>
                </>
              )}

              {activeTab === 'inscription' && (
                <>
                  <section>
                    <h2 className="u-group-label">
                      {t('designer.inscription')}
                    </h2>
                    <div className="mt-3">
                      <p className="u-group-label">
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
                                'border px-2 py-1 text-xs transition',
                                active
                                  ? 'u-chip u-chip-active'
                                  : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
                              ].join(' ')}
                            >
                              {t(preset.label)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <textarea
                      className="mt-3 h-20 w-full resize-none u-field"
                      value={inscription}
                      onChange={(e) => {
                        setInscription(e.target.value);
                        setPresetIndex(null);
                      }}
                      placeholder={t('designer.inscriptionPlaceholder')}
                      aria-label={t('designer.inscription')}
                      maxLength={140}
                    />
                    <p className="mt-1 text-right text-[10px] text-ink-3">
                      {inscription.length}/140
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                      <label className="block">
                        <span className="u-group-label">
                          {t('designer.name')}
                        </span>
                        <input
                          type="text"
                          className="mt-1 w-full u-field"
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
                        <span className="u-group-label">
                          {t('designer.dates')}
                        </span>
                        <input
                          type="text"
                          className="mt-1 w-full u-field"
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
                    <h2 className="u-group-label">
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

            <div className="space-y-3 border-t border-line bg-canvas p-5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-xs text-ink-3">{t('designer.estimatedCost')}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {materialLabel(selectedMaterial?.name, t, '-')} · {dimensions.heightCm}×
                    {dimensions.widthCm} {t('designer.units.cm')}
                  </span>
                </div>
                <span className="shrink-0 u-display text-3xl text-brand">
                  {formatFromByn(estimatedPrice, { digits: 2 })} {t('designer.priceUnit')}
                </span>
              </div>

              {/* The price the customer decides on is the one place a stale
                  conversion has to be visible rather than merely logged. */}
              {isRateStale ? (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-brand/80">
                  <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                  {t('designer.rateStale')}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedMaterial || isSubmitting}
                className="u-btn u-btn-primary w-full py-3"
              >
                {isSubmitting
                  ? t('designer.submitting')
                  : user
                    ? t('designer.placeOrder')
                    : t('designer.signInToOrder')}
              </button>

              {submitMessage ? (
                <p className="border border-positive bg-positive-soft px-3 py-2 text-xs text-positive">
                  {submitMessage}
                </p>
              ) : null}
              {submitError ? (
                <p className="border border-critical bg-critical-soft px-3 py-2 text-xs text-critical">
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
    <div className="flex items-center justify-between text-xs text-ink-2">
      <span>{label}</span>
      <span className="font-mono text-ink">
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
      className="mt-1 w-full accent-brand"
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
  <label className="flex cursor-pointer items-start gap-3 border border-line bg-canvas px-3 py-2 transition hover:border-line-strong">
    <input
      type="checkbox"
      className="mt-1 accent-brand"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="flex-1">
      <span className="block text-sm text-ink">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] text-ink-3">{hint}</span> : null}
    </span>
  </label>
);
