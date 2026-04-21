import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@application/auth/auth-context';
import type { FinishType } from '@domain/entities/order-card';
import type { Material } from '@domain/entities/material';
import { submitOrderRequest } from '@infrastructure/api/order-api';
import { Header } from '@presentation/components/header';
import { MonumentViewer } from '@presentation/three/monument-viewer';

interface DesignerPageProps {
  materials: Material[];
}

const FINISH_OPTIONS: FinishType[] = ['Polished', 'Honed', 'Matte'];
const DEFAULT_DIMENSIONS = { heightCm: 180, widthCm: 90, thicknessCm: 15 };

const serializeDimensions = (d: { heightCm: number; widthCm: number; thicknessCm: number }) =>
  `${d.heightCm}x${d.widthCm}x${d.thicknessCm}`;

const priceOf = (m: Material | undefined, d: { heightCm: number; widthCm: number }) => {
  if (!m) return 0;
  const areaM2 = (d.heightCm * d.widthCm) / 10000;
  return Math.round(areaM2 * m.pricePerM2 * 100) / 100;
};

export const DesignerPage = ({ materials }: DesignerPageProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [materialId, setMaterialId] = useState<string>('');
  const [finish, setFinish] = useState<FinishType>('Polished');
  const [inscription, setInscription] = useState<string>('In loving memory');
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!materialId && materials.length > 0) {
      setMaterialId(materials[0].id);
    }
  }, [materialId, materials]);

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId) ?? materials[0],
    [materialId, materials]
  );

  const estimatedPrice = priceOf(selectedMaterial, dimensions);

  const textureUrl = selectedMaterial?.imageUrl ?? '/images/black%20granite.png';

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
      setSubmitMessage('Order submitted successfully. Our team will contact you shortly.');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-100">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">3D Designer</p>
          <h1 className="mt-1 font-serif text-4xl text-gray-100">
            Design your monument in real time
          </h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Choose the stone, finish, size, and engraving. Drag to rotate, scroll to zoom.
            What you see is what we craft.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <MonumentViewer
            textureUrl={textureUrl}
            finish={finish}
            dimensions={dimensions}
            inscription={inscription}
          />

          <aside className="space-y-5 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">Material</h2>
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
                          {m.pricePerM2.toFixed(0)} PLN / m2
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">Finish</h2>
              <div className="mt-3 flex gap-2">
                {FINISH_OPTIONS.map((f) => {
                  const active = f === finish;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFinish(f)}
                      className={[
                        'flex-1 rounded-md border px-3 py-2 text-sm transition',
                        active
                          ? 'border-amber-300 bg-amber-300/10 text-amber-100'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      ].join(' ')}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">Dimensions</h2>
              <div className="mt-3 space-y-3">
                <SliderRow
                  label="Height"
                  value={dimensions.heightCm}
                  min={90}
                  max={240}
                  step={5}
                  unit="cm"
                  onChange={updateDimension('heightCm')}
                />
                <SliderRow
                  label="Width"
                  value={dimensions.widthCm}
                  min={40}
                  max={140}
                  step={5}
                  unit="cm"
                  onChange={updateDimension('widthCm')}
                />
                <SliderRow
                  label="Thickness"
                  value={dimensions.thicknessCm}
                  min={8}
                  max={30}
                  step={1}
                  unit="cm"
                  onChange={updateDimension('thicknessCm')}
                />
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-[0.16em] text-slate-400">Inscription</h2>
              <textarea
                className="mt-3 h-20 w-full resize-none rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-gray-100 focus:border-amber-300 focus:outline-none"
                value={inscription}
                onChange={(e) => setInscription(e.target.value)}
                placeholder="In loving memory..."
                maxLength={140}
              />
              <p className="mt-1 text-right text-[10px] text-slate-500">
                {inscription.length}/140
              </p>
            </section>

            <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Estimated material cost</span>
                <span className="font-serif text-2xl text-amber-200">
                  {estimatedPrice.toFixed(2)} PLN
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Final price may include engraving and installation. Confirmed by our team.
              </p>
            </section>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedMaterial || isSubmitting}
              className="w-full rounded-md bg-gray-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              {isSubmitting
                ? 'Submitting...'
                : user
                  ? 'Place order'
                  : 'Sign in to place order'}
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
