import { useState, type FormEvent } from 'react';
import { useTranslation } from '@application/i18n/i18n-context';
import { submitContactMessage } from '@infrastructure/api/contact-api';
import { isRateLimited } from '@infrastructure/api/api-client';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  message: '',
  /**
   * Bot trap. Hidden from sight, from the tab order and from screen readers, so
   * nothing but an automated form filler ever puts a value in it. The server
   * drops any message that arrives with this field set.
   */
  website: ''
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
        message: form.message.trim(),
        website: form.website
      });
      setStatus('success');
      setFeedback(t('contact.success'));
      setForm(initialForm);
    } catch (error) {
      setStatus('error');
      setFeedback(isRateLimited(error) ? t('auth.tooManyAttempts') : t('contact.error'));
    }
  };

  const isSubmitting = status === 'submitting';

  return (
    <section className="py-16 sm:py-24" id="contact">
      <div className="mx-auto w-full max-w-2xl px-4 text-center sm:px-6">
        <h2 className="u-display text-3xl text-ink sm:text-4xl">{t('contact.title')}</h2>
        <p className="mx-auto mt-3 max-w-prose text-ink-2">{t('contact.subtitle')}</p>

        <form
          className="mt-10 grid gap-6 text-left sm:grid-cols-2"
          onSubmit={handleSubmit}
          noValidate
        >
          <div aria-hidden="true" className="hidden">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={updateField('website')}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="u-label" htmlFor="contact-name">
              {t('contact.fullName')}
            </label>
            <input
              id="contact-name"
              type="text"
              required
              autoComplete="name"
              className="u-field"
              value={form.name}
              onChange={updateField('name')}
              placeholder={t('contact.fullNamePlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="u-label" htmlFor="contact-email">
              {t('contact.email')}
            </label>
            <input
              id="contact-email"
              type="email"
              required
              autoComplete="email"
              className="u-field"
              value={form.email}
              onChange={updateField('email')}
              placeholder={t('contact.emailPlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="u-label" htmlFor="contact-phone">
              {t('contact.phone')}{' '}
              <span className="font-normal text-ink-3">{t('contact.phoneOptional')}</span>
            </label>
            <input
              id="contact-phone"
              type="tel"
              autoComplete="tel"
              className="u-field"
              value={form.phone}
              onChange={updateField('phone')}
              placeholder={t('contact.phonePlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="u-label" htmlFor="contact-message">
              {t('contact.message')}
            </label>
            <textarea
              id="contact-message"
              required
              rows={6}
              className="u-field resize-y"
              value={form.message}
              onChange={updateField('message')}
              placeholder={t('contact.messagePlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          {/* The outcome sits directly above the control that produced it,
              so the reader does not have to hunt for it after submitting. */}
          {feedback ? (
            <p
              className={[
                'border px-4 py-3 text-sm sm:col-span-2',
                status === 'success'
                  ? 'border-positive bg-positive-soft text-positive'
                  : 'border-critical bg-critical-soft text-critical'
              ].join(' ')}
              role={status === 'error' ? 'alert' : 'status'}
            >
              {feedback}
            </p>
          ) : null}

          <div className="flex flex-col items-center gap-4 pt-2 text-center sm:col-span-2">
            <button
              type="submit"
              className="u-btn u-btn-primary w-full px-6 py-3.5 sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('contact.sending') : t('contact.send')}
            </button>
            <p className="max-w-prose text-xs text-ink-3">{t('contact.privacyHint')}</p>
          </div>
        </form>
      </div>
    </section>
  );
};
