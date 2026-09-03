import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ImagePlus } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import { LANGUAGE_LOCALES } from '@application/i18n/translations';
import {
  uploadInstallationPhoto,
  type InstallationCard,
  type InstallationReport,
  type InstallationReportInput
} from '@infrastructure/api/installation-card-api';
import { ORDER_STATUSES, ORDER_STATUS_LABEL_KEYS } from '@domain/entities/order-status';

const WORK_STATUSES = ORDER_STATUSES.map((id) => ({ id, labelKey: ORDER_STATUS_LABEL_KEYS[id] }));

/**
 * What the crew records on site, written to `installation_cards`.
 *
 * The status here is the installer's own, kept apart from the order status the
 * office sets: the two answer different questions — what the workshop has
 * promised, and what has actually been done at the cemetery.
 */
export const InstallationReportForm = ({
  card,
  onSave,
  onReport
}: {
  card: InstallationCard;
  onSave: (input: InstallationReportInput) => Promise<void>;
  onReport: (report: InstallationReport) => void;
}) => {
  const { t, language } = useTranslation();
  const dateLocale = LANGUAGE_LOCALES[language];
  const report = card.report;

  const [status, setStatus] = useState(report?.status ?? card.status);
  const [comments, setComments] = useState(report?.workerComments ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // A refresh of the worklist brings server values back; keep the fields in
  // step with them unless the installer is mid-save.
  useEffect(() => {
    setStatus(report?.status ?? card.status);
    setComments(report?.workerComments ?? '');
  }, [report?.status, report?.workerComments, card.status]);

  const pickPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input straight away, so choosing the same file twice still fires.
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      onReport(await uploadInstallationPhoto(card.orderId, file));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('installer.saveError'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('saving');
    setError(null);
    try {
      await onSave({ status, workerComments: comments });
      setState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('installer.saveError'));
      setState('idle');
    }
  };

  const fieldClass =
    'mt-1 w-full u-field';

  return (
    <form onSubmit={submit} className="mt-3 border border-line bg-canvas p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] uppercase tracking-wider text-ink-3">
          {t('installer.reportSection')}
        </h3>
        {report?.completionTimestamp ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-positive">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('installer.completedAt')}{' '}
            {new Date(report.completionTimestamp).toLocaleString(dateLocale)}
          </span>
        ) : (
          <span className="text-[11px] italic text-ink-3">
            {/* A handed-over job already has a card, so the card's existence no
                longer means the crew wrote something. What it recorded does. */}
            {report?.workerComments || report?.photoPath ? '' : t('installer.notReported')}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-ink-3">{t('installer.workStatus')}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
            {WORK_STATUSES.map((option) => (
              <option key={option.id} value={option.id}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <div className="block">
          <span className="text-xs text-ink-3">{t('installer.photoEvidence')}</span>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={pickPhoto}
            className="sr-only"
            aria-label={t('installer.photoEvidence')}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className={`${fieldClass} flex items-center justify-center gap-2 hover:border-brand disabled:opacity-60`}
          >
            <ImagePlus className="h-4 w-4 text-ink-3" />
            {uploading
              ? t('installer.uploading')
              : report?.photoUrl
                ? t('installer.replacePhoto')
                : t('installer.choosePhoto')}
          </button>
          <span className="mt-1 block text-[11px] text-ink-3">{t('installer.photoHint')}</span>
        </div>
      </div>

      <label className="mt-3 block">
        <span className="text-xs text-ink-3">{t('installer.workerComments')}</span>
        <textarea
          rows={2}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder={t('installer.workerCommentsPlaceholder')}
          className={`${fieldClass} resize-y`}
        />
      </label>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-critical">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {report?.photoUrl ? (
          <a
            href={report.photoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-xs text-brand hover:text-brand"
          >
            <img
              src={report.photoUrl}
              alt=""
              className="h-12 w-12 rounded border border-line object-cover"
            />
            {t('installer.openPhoto')}
          </a>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-3">
          {state === 'saved' ? (
            <span className="text-xs text-positive">{t('installer.saved')}</span>
          ) : null}
          <button
            type="submit"
            disabled={state === 'saving'}
            className="u-btn u-btn-primary px-3 py-1.5 text-xs"
          >
            {state === 'saving' ? t('installer.saving') : t('installer.save')}
          </button>
        </div>
      </div>
    </form>
  );
};
