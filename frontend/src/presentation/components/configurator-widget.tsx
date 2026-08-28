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
    <section className="mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6" id="configurator">
      <div className="border border-line bg-surface p-6 md:p-8">
        <h2 className="u-display text-3xl text-ink sm:text-4xl">{t('configurator.title')}</h2>
        <p className="mt-2 text-ink-2">{t('configurator.subtitle')}</p>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="u-label">{t('configurator.material')}</span>
            <select
              className="u-field"
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
              disabled={materials.length === 0}
            >
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {materialLabel(material.name, t)} (
                  {formatFromByn(material.pricePerM2, { digits: 2 })} {t('designer.pricePerM2Unit')}
                  )
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="u-label">{t('configurator.inscription')}</span>
            <input
              type="text"
              className="u-field"
              value={inscriptionText}
              onChange={(event) => setInscriptionText(event.target.value)}
              placeholder={t('configurator.inscriptionPlaceholder')}
            />
          </label>

          <label className="space-y-2">
            <span className="u-label">{t('configurator.finishType')}</span>
            <select
              className="u-field"
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
            <span className="u-label">{t('configurator.dimensions')}</span>
            <input
              type="text"
              className="u-field"
              value={dimensions}
              onChange={(event) => setDimensions(event.target.value)}
              placeholder={t('configurator.dimensionsPlaceholder')}
            />
          </label>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4">
          {isAuthenticated ? (
            <p className="text-xs text-positive">{t('configurator.readyToSubmit')}</p>
          ) : (
            <p className="text-xs text-brand">{t('configurator.signInHint')}</p>
          )}
          <button
            type="button"
            onClick={handleCreateOrder}
            className="u-btn u-btn-primary"
            disabled={!selectedMaterial || isSubmitting}
          >
            {isSubmitting
              ? t('configurator.submitting')
              : isAuthenticated
                ? t('configurator.submit')
                : t('configurator.signInButton')}
          </button>
        </div>
        {submitMessage ? <p className="mt-4 text-sm text-ink-2">{submitMessage}</p> : null}
      </div>
    </section>
  );
};
