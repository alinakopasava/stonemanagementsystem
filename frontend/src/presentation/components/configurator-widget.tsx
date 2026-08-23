import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FinishType } from '@domain/entities/order-card';
import type { Material } from '@domain/entities/material';
import type { Product } from '@domain/entities/product';
import { useAuth } from '@application/auth/auth-context';
import { useTranslation } from '@application/i18n/i18n-context';
import { useCurrency } from '@application/currency/currency-context';
import { materialLabel } from '@application/i18n/catalog-labels';
import type { TranslationKey } from '@application/i18n/translations';
import { submitOrderRequest } from '@infrastructure/api/order-api';
import { isRateLimited } from '@infrastructure/api/api-client';

interface ConfiguratorWidgetProps {
  materials: Material[];
  product: Product;
}

const finishOptions: { id: FinishType; labelKey: TranslationKey }[] = [
  { id: 'Polished', labelKey: 'designer.finish.polished' },
  { id: 'Matte', labelKey: 'designer.finish.matte' },
  { id: 'Honed', labelKey: 'designer.finish.honed' }
];

export const ConfiguratorWidget = ({ materials, product: _product }: ConfiguratorWidgetProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatFromByn } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
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
      navigate('/sign-in', {
        state: { from: location.pathname + location.search + location.hash }
      });
      return;
    }
    if (!selectedMaterial) return;

    try {
      setIsSubmitting(true);
      setSubmitMessage(null);

      await submitOrderRequest({
        materialId: selectedMaterial.id,
        dimensions,
        inscriptionText,
        finishType
      });

      setSubmitMessage(t('configurator.success'));
    } catch (error) {
      setSubmitMessage(isRateLimited(error) ? t('auth.tooManyAttempts') : t('configurator.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10" id="configurator">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 md:p-8">
        <h2 className="font-serif text-3xl text-gray-100">{t('configurator.title')}</h2>
        <p className="mt-2 text-slate-300">{t('configurator.subtitle')}</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-200">{t('configurator.material')}</span>
            <select
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100"
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
              disabled={materials.length === 0}
            >
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {materialLabel(material.name, t)} ({formatFromByn(material.pricePerM2, { digits: 2 })} {t('designer.pricePerM2Unit')})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-200">{t('configurator.inscription')}</span>
            <input
              type="text"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100"
              value={inscriptionText}
              onChange={(event) => setInscriptionText(event.target.value)}
              placeholder={t('configurator.inscriptionPlaceholder')}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-200">{t('configurator.finishType')}</span>
            <select
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100"
              value={finishType}
              onChange={(event) => setFinishType(event.target.value as FinishType)}
            >
              {finishOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm text-slate-200">{t('configurator.dimensions')}</span>
            <input
              type="text"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100"
              value={dimensions}
              onChange={(event) => setDimensions(event.target.value)}
              placeholder={t('configurator.dimensionsPlaceholder')}
            />
          </label>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4">
          {isAuthenticated ? (
            <p className="text-xs text-emerald-300">{t('configurator.readyToSubmit')}</p>
          ) : (
            <p className="text-xs text-amber-300">{t('configurator.signInHint')}</p>
          )}
          <button
            type="button"
            onClick={handleCreateOrder}
            className="rounded-md bg-gray-100 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            disabled={!selectedMaterial || isSubmitting}
          >
            {isSubmitting
              ? t('configurator.submitting')
              : isAuthenticated
                ? t('configurator.submit')
                : t('configurator.signInButton')}
          </button>
        </div>
        {submitMessage ? <p className="mt-4 text-sm text-slate-300">{submitMessage}</p> : null}
      </div>
    </section>
  );
};
