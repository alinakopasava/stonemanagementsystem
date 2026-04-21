import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FinishType } from '@domain/entities/order-card';
import type { Material } from '@domain/entities/material';
import type { Product } from '@domain/entities/product';
import { useAuth } from '@application/auth/auth-context';
import { submitOrderRequest } from '@infrastructure/api/order-api';

interface ConfiguratorWidgetProps {
  materials: Material[];
  product: Product;
}

const finishOptions: FinishType[] = ['Polished', 'Matte', 'Honed'];

export const ConfiguratorWidget = ({ materials, product: _product }: ConfiguratorWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user);

  const [materialId, setMaterialId] = useState<string>('');
  const [inscriptionText, setInscriptionText] = useState<string>('');
  const [finishType, setFinishType] = useState<FinishType>('Polished');
  const [dimensions, setDimensions] = useState<string>('180x60');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!materialId && materials.length > 0) {
      setMaterialId(materials[0].id);
    }
  }, [materialId, materials]);

  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === materialId) ?? materials[0],
    [materialId, materials]
  );

  const handleCreateOrder = async () => {
    if (!isAuthenticated) {
      navigate('/sign-in', { state: { from: '/' } });
      return;
    }
    if (!selectedMaterial) return;

    try {
      setIsSubmitting(true);
      setSubmitMessage(null);

      const response = await submitOrderRequest({
        materialId: selectedMaterial.id,
        dimensions,
        inscriptionText,
        finishType
      });

      console.log('Submitted order:', response);
      setSubmitMessage('Order submitted successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit order.';
      setSubmitMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10" id="configurator">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 md:p-8">
        <h2 className="font-serif text-3xl text-gray-100">Make Order</h2>
        <p className="mt-2 text-slate-300">
          Choose material and dimensions for your monument. Ordering is available only after login.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-200">Material</span>
            <select
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100"
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
              disabled={materials.length === 0}
            >
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.pricePerM2.toFixed(2)} PLN / m2)
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-200">Inscription Text</span>
            <input
              type="text"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100"
              value={inscriptionText}
              onChange={(event) => setInscriptionText(event.target.value)}
              placeholder="Beloved forever..."
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-200">Finish Type</span>
            <select
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100"
              value={finishType}
              onChange={(event) => setFinishType(event.target.value as FinishType)}
            >
              {finishOptions.map((finish) => (
                <option key={finish} value={finish}>
                  {finish}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-200">Dimensions</span>
            <input
              type="text"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100"
              value={dimensions}
              onChange={(event) => setDimensions(event.target.value)}
              placeholder="e.g. 180x60 (cm)"
            />
          </label>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4">
          {isAuthenticated ? (
            <p className="text-xs text-emerald-300">Signed in &mdash; ready to submit.</p>
          ) : (
            <p className="text-xs text-amber-300">
              Please sign in first to unlock order submission.
            </p>
          )}
          <button
            type="button"
            onClick={handleCreateOrder}
            className="rounded-md bg-gray-100 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            disabled={!selectedMaterial || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : isAuthenticated ? 'Make Order' : 'Sign in to order'}
          </button>
        </div>
        {submitMessage ? <p className="mt-4 text-sm text-slate-300">{submitMessage}</p> : null}
      </div>
    </section>
  );
};
