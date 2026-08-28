import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Mail, MailOpen, Trash2 } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import { LANGUAGE_LOCALES, type TranslationKey } from '@application/i18n/translations';
import {
  deleteContactMessage,
  fetchAdminContactMessages,
  updateContactMessageStatus,
  type AdminContactMessage,
  type ContactMessageStatus
} from '@infrastructure/api/admin-api';

const STATUS_FILTERS: Array<{ id: ContactMessageStatus | 'all'; labelKey: TranslationKey }> = [
  { id: 'all', labelKey: 'admin.messages.filter.all' },
  { id: 'new', labelKey: 'admin.messages.filter.new' },
  { id: 'read', labelKey: 'admin.messages.filter.read' },
  { id: 'archived', labelKey: 'admin.messages.filter.archived' }
];

const STATUS_LABEL_KEYS: Record<ContactMessageStatus, TranslationKey> = {
  new: 'admin.messages.filter.new',
  read: 'admin.messages.filter.read',
  archived: 'admin.messages.filter.archived'
};

const statusBadge: Record<ContactMessageStatus, string> = {
  new: 'bg-brand-soft text-brand border-brand',
  read: 'bg-info-soft text-info border-info',
  archived: 'bg-surface-2 text-ink-2 border-line-strong'
};

export const AdminMessagesPage = () => {
  const { t, language } = useTranslation();
  const dateLocale = LANGUAGE_LOCALES[language];
  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
  const [filter, setFilter] = useState<ContactMessageStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchAdminContactMessages(filter === 'all' ? undefined : filter);
      setMessages(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.messages.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: ContactMessageStatus) => {
    setBusyId(id);
    try {
      const { data } = await updateContactMessageStatus(id, status);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: data.status, read_at: data.read_at, read_by: data.read_by }
            : m
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.messages.updateError'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.messages.deleteConfirm'))) return;
    setBusyId(id);
    try {
      await deleteContactMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.messages.deleteError'));
    } finally {
      setBusyId(null);
    }
  };

  const newCount = useMemo(() => messages.filter((m) => m.status === 'new').length, [messages]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="u-display text-3xl text-ink sm:text-4xl">{t('admin.messages.title')}</h1>
          <p className="mt-1 text-sm text-ink-3">
            {t('admin.messages.subtitle')}
            {filter === 'all' && newCount > 0 ? (
              <span className="ml-2 bg-brand-soft px-2 py-0.5 text-xs text-brand">
                {t('admin.messages.newBadge', { count: newCount })}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden border border-line">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`px-3 py-1.5 text-xs transition ${
                  filter === option.id
                    ? 'bg-surface-2 text-ink'
                    : 'text-ink-3 hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            className="border border-line px-3 py-1.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
          >
            {t('admin.common.refresh')}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 border border-critical bg-critical-soft px-3 py-2 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {isLoading ? (
          <div className="border border-line bg-surface p-6 text-center text-ink-3">
            {t('admin.common.loading')}
          </div>
        ) : messages.length === 0 ? (
          <div className="border border-line bg-surface p-6 text-center text-ink-3">
            {t('admin.messages.empty')}
          </div>
        ) : (
          messages.map((m) => (
            <article key={m.id} className="border border-line bg-surface p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-ink">{m.name}</h2>
                  <p className="mt-1 text-xs text-ink-3">
                    <a href={`mailto:${m.email}`} className="text-ink-2 hover:text-ink">
                      {m.email}
                    </a>
                    {m.phone ? (
                      <>
                        {' · '}
                        <a href={`tel:${m.phone}`} className="text-ink-2 hover:text-ink">
                          {m.phone}
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    {new Date(m.created_at).toLocaleString(dateLocale)}
                  </p>
                </div>
                <span
                  className={`border px-3 py-1 text-[10px] uppercase tracking-wider ${
                    statusBadge[m.status]
                  }`}
                >
                  {t(STATUS_LABEL_KEYS[m.status])}
                </span>
              </header>

              <p className="mt-4 whitespace-pre-wrap text-sm text-ink-2">{m.message}</p>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                {m.status !== 'read' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(m.id, 'read')}
                    disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink disabled:opacity-60"
                  >
                    <MailOpen className="h-3.5 w-3.5" />
                    {t('admin.messages.markRead')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(m.id, 'new')}
                    disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink disabled:opacity-60"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t('admin.messages.markNew')}
                  </button>
                )}

                {m.status !== 'archived' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(m.id, 'archived')}
                    disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs text-ink-2 hover:border-line-strong hover:text-ink disabled:opacity-60"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {t('admin.messages.archive')}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  disabled={busyId === m.id}
                  className="inline-flex items-center gap-1.5 border border-critical px-3 py-1.5 text-xs text-critical hover:border-critical hover:bg-critical-soft disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('admin.messages.delete')}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
