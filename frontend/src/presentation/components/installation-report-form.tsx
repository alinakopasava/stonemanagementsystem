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

/** Only the office cancels an order; the API refuses it from the crew too. */
const OFFICE_ONLY_STATUSES: readonly string[] = ['anulowane'];

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
  // Starts empty and empties again after each report: the field is for what
  // the crew is adding now, and what they sent is already with the office.
  const [comments, setComments] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // A photograph picked but not yet sent. It goes up with the report, on
  // "save", like the comment — until then the office has nothing to see.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingPhoto) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingPhoto);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);

  // A refresh of the worklist brings the stored status back.
  useEffect(() => {
    setStatus(report?.status ?? card.status);
  }, [report?.status, card.status]);

  /*
   * The status goes to the server as soon as it is picked, so the office sees
   * it without the crew having to press save. Only the status: the comment is
   * sent as last saved, and a half-written one — like a picked photograph —
   * stays a draft until "save". Nor is this a report, so it does not say
   * "saved". The order status the customer sees is untouched: only the office
   * sets that.
   */
  const changeStatus = async (next: string) => {
    const previous = status;
    setStatus(next);
    setState('idle');
    setError(null);
    try {
      await onSave({ status: next, workerComments: report?.workerComments ?? '' });
    } catch (err) {
      setStatus(previous);
      setError(err instanceof Error ? err.message : t('installer.saveError'));
    }
  };

  const pickPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input straight away, so choosing the same file twice still fires.
    event.target.value = '';
    if (!file) return;
    setPendingPhoto(file);
    setState('idle');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('saving');
    setError(null);
    try {
      // An empty field means "nothing new", not "erase what was sent before".
      await onSave({ status, workerComments: comments.trim() || report?.workerComments || '' });
      // After the report, not before: a photograph on a job still "oczekujące"
      // moves it to "w_realizacji" on the server, and the report saved second
      // would put it back.
      if (pendingPhoto) {
        setUploading(true);
        onReport(await uploadInstallationPhoto(card.orderId, pendingPhoto));
        setPendingPhoto(null);
      }
      setComments('');
      setState('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('installer.saveError'));
      setState('idle');
    } finally {
      setUploading(false);
    }
  };

  // Only the photograph waiting to be sent; the one already saved is the office's.
  const photoUrl = pendingPreview;
  const savedStatus = report?.status ?? card.status;

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
          <select value={status} onChange={(e) => void changeStatus(e.target.value)} className={fieldClass}>
            {/* An office-only status stays listed on a card that already has
                it, so the field shows what is stored rather than lying. */}
            {WORK_STATUSES.filter(
              (option) =>
                !OFFICE_ONLY_STATUSES.includes(option.id) || option.id === savedStatus
            ).map((option) => (
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
              : photoUrl
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
        {photoUrl ? (
          <a
            href={photoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 text-xs text-brand hover:text-brand"
          >
            <img
              src={photoUrl}
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
