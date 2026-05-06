import { useState, type FormEvent } from 'react';
import { Mail, Phone, Send, User } from 'lucide-react';
import { useTranslation } from '@application/i18n/i18n-context';
import { submitContactMessage } from '@infrastructure/api/contact-api';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  message: ''
};

export const ContactForm = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<Status>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  const updateField =
    (field: keyof typeof initialForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (status === 'submitting') return;

    setStatus('submitting');
    setFeedback(null);

    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        message: form.message.trim()
      });
      setStatus('success');
      setFeedback(t('contact.success'));
      setForm(initialForm);
    } catch (error) {
      setStatus('error');
      setFeedback(error instanceof Error ? error.message : t('contact.error'));
    }
  };

  const isSubmitting = status === 'submitting';

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10" id="contact">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 md:p-8">
        <h2 className="font-serif text-3xl text-gray-100">{t('contact.title')}</h2>
        <p className="mt-2 max-w-2xl text-slate-300">{t('contact.subtitle')}</p>

        <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm text-slate-200">
              <User className="h-4 w-4 text-amber-300" />
              {t('contact.fullName')}
            </span>
            <input
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={form.name}
              onChange={updateField('name')}
              placeholder={t('contact.fullNamePlaceholder')}
              disabled={isSubmitting}
            />
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm text-slate-200">
              <Mail className="h-4 w-4 text-amber-300" />
              {t('contact.email')}
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={form.email}
              onChange={updateField('email')}
              placeholder={t('contact.emailPlaceholder')}
              disabled={isSubmitting}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="flex items-center gap-2 text-sm text-slate-200">
              <Phone className="h-4 w-4 text-amber-300" />
              {t('contact.phone')}{' '}
              <span className="text-slate-500">{t('contact.phoneOptional')}</span>
            </span>
            <input
              type="tel"
              autoComplete="tel"
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={form.phone}
              onChange={updateField('phone')}
              placeholder={t('contact.phonePlaceholder')}
              disabled={isSubmitting}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-200">{t('contact.message')}</span>
            <textarea
              required
              rows={6}
              className="w-full resize-y rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-gray-100 focus:border-amber-300 focus:outline-none"
              value={form.message}
              onChange={updateField('message')}
              placeholder={t('contact.messagePlaceholder')}
              disabled={isSubmitting}
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4">
            {feedback ? (
              <p
                className={`text-sm ${
                  status === 'success' ? 'text-emerald-300' : 'text-rose-300'
                }`}
                role={status === 'error' ? 'alert' : undefined}
              >
                {feedback}
              </p>
            ) : (
              <p className="text-xs text-slate-400">{t('contact.privacyHint')}</p>
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              disabled={isSubmitting}
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? t('contact.sending') : t('contact.send')}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
