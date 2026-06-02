import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Mail, MailOpen, Trash2 } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import type { TranslationKey } from '@application/i18n/translations';
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
  new: 'bg-amber-300/10 text-amber-200 border-amber-300/30',
  read: 'bg-sky-300/10 text-sky-200 border-sky-300/30',
  archived: 'bg-slate-500/10 text-slate-300 border-slate-500/30'
};

export const AdminMessagesPage = () => {
  const { t } = useTranslation();
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

  const newCount = useMemo(
    () => messages.filter((m) => m.status === 'new').length,
    [messages]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-gray-100">{t('admin.messages.title')}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {t('admin.messages.subtitle')}
            {filter === 'all' && newCount > 0 ? (
              <span className="ml-2 rounded-full bg-amber-300/10 px-2 py-0.5 text-xs text-amber-200">
                {t('admin.messages.newBadge', { count: newCount })}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-slate-700">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`px-3 py-1.5 text-xs transition ${
                  filter === option.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
          >
            {t('admin.common.refresh')}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-slate-400">
            {t('admin.common.loading')}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 text-center text-slate-400">
            {t('admin.messages.empty')}
          </div>
        ) : (
          messages.map((m) => (
            <article
              key={m.id}
              className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-5"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-slate-100">{m.name}</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    <a
                      href={`mailto:${m.email}`}
                      className="text-slate-300 hover:text-white"
                    >
                      {m.email}
                    </a>
                    {m.phone ? (
                      <>
                        {' · '}
                        <a
                          href={`tel:${m.phone}`}
                          className="text-slate-300 hover:text-white"
                        >
                          {m.phone}
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
                    statusBadge[m.status]
                  }`}
                >
                  {t(STATUS_LABEL_KEYS[m.status])}
                </span>
              </header>

              <p className="mt-4 whitespace-pre-wrap text-sm text-slate-200">
                {m.message}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                {m.status !== 'read' ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(m.id, 'read')}
                    disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-60"
                  >
                    <MailOpen className="h-3.5 w-3.5" />
                    {t('admin.messages.markRead')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(m.id, 'new')}
                    disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-60"
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-60"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {t('admin.messages.archive')}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  disabled={busyId === m.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 px-3 py-1.5 text-xs text-rose-200 hover:border-rose-400 hover:bg-rose-500/10 disabled:opacity-60"
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
